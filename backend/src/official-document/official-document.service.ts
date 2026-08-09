// backend/src/official-document/official-document.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import {
  OFFICIAL_DOCUMENTS,
  PROCEDURE_BUNDLES,
  PROCEDURES,
  getDocumentById,
  OfficialDocument,
} from './official-document-registry';

const ASSETS_ROOT = path.join(process.cwd(), 'assets', 'official-forms');
// 日本語フォント。以前はNotoSansCJKjp-Regular.otf(16.4MB、汎CJK版)を使っていたが、
// subset化するとPDF内で一部文字が欠落する不具合があり subset:false 埋め込み必須のため、
// 生成PDFが1書類あたり約14MBに膨れプレビューが実質的に固まる不具合があった。
// Google Fonts「Noto Sans JP」(OFLライセンス, 日本語専用・軽量版)の可変フォントから
// fonttools varLib.instancerでRegular(wght=400)静的インスタンスを抽出したものに差し替え、
// 同じくsubset:falseのまま埋め込みサイズを約1/3(約14MB→約3.5MB)に削減した。
const FONT_PATH = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansJP-Regular.ttf');

@Injectable()
export class OfficialDocumentService {
  private readonly logger = new Logger(OfficialDocumentService.name);
  private fontBytesCache: Buffer | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** カテゴリ別にグルーピングした一覧(自動入力対応の有無を含む) */
  listDocuments() {
    const categories = new Map<string, { category: string; documents: any[] }>();

    for (const doc of OFFICIAL_DOCUMENTS) {
      if (!categories.has(doc.category)) {
        categories.set(doc.category, { category: doc.category, documents: [] });
      }

      categories.get(doc.category)!.documents.push({
        id: doc.id,
        label: doc.label,
        description: doc.description,
        hasAutofill: Boolean(doc.fields),
      });
    }

    return Array.from(categories.values());
  }

  listBundles() {
    return PROCEDURE_BUNDLES.map((b) => ({
      id: b.id,
      procedureKey: b.procedureKey,
      vehicleCategory: b.vehicleCategory,
      label: b.label,
      description: b.description,
      documents: b.documentIds.map((id) => {
        const doc = getDocumentById(id);
        return { id, label: doc?.label ?? id, hasAutofill: Boolean(doc?.fields) };
      }),
    }));
  }

  /** ウィザードのStep1(手続きの種類)で使う選択肢一覧 */
  listProcedures() {
    return PROCEDURES;
  }

  private async loadFont(): Promise<Buffer> {
    if (!this.fontBytesCache) {
      this.fontBytesCache = await readFile(FONT_PATH);
    }

    return this.fontBytesCache;
  }

  private async loadBlankBytes(doc: OfficialDocument): Promise<Buffer> {
    const filePath = path.join(ASSETS_ROOT, doc.filePath);
    return readFile(filePath);
  }

  async getBlankPdf(documentId: string): Promise<{ bytes: Buffer; label: string }> {
    const doc = getDocumentById(documentId);

    if (!doc) {
      throw new BadRequestException('書類が見つかりません。');
    }

    const bytes = await this.loadBlankBytes(doc);
    return { bytes, label: doc.label };
  }

  /** 指定したページに、車両情報(・整備工場情報)を上書き印字する(自動入力未対応の書類は何もしない) */
  async renderDocument(page: PDFPage, doc: OfficialDocument, vehicle: any, company: any, font: PDFFont) {
    if (!doc.fields || doc.fields.length === 0) return;

    const rotation = page.getRotation().angle;
    const H = page.getHeight();

    for (const field of doc.fields) {
      const text = field.text(vehicle, company);
      if (!text) continue;

      let x: number;
      let y: number;
      let rotate = degrees(0);

      if (rotation === 90) {
        x = field.visualY;
        y = field.visualX;
        rotate = degrees(90);
      } else {
        // rotation 0 (未対応の回転角は0として扱う)
        x = field.visualX;
        y = H - field.visualY;
      }

      page.drawText(text, { x, y, size: field.size, font, color: rgb(0, 0, 0), rotate });
    }
  }

  private async getVehicle(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle) {
      throw new BadRequestException('車両が見つかりません。');
    }

    return vehicle;
  }

  /** 書類1件を、対応していれば車両情報で自動入力して返す */
  async generateSingleDocument(documentId: string, vehicleId: number): Promise<{ bytes: Uint8Array; label: string }> {
    const doc = getDocumentById(documentId);

    if (!doc) {
      throw new BadRequestException('書類が見つかりません。');
    }

    const vehicle = await this.getVehicle(vehicleId);
    const blankBytes = await this.loadBlankBytes(doc);
    const pdfDoc = await PDFDocument.load(blankBytes, { ignoreEncryption: true });

    if (doc.fields && doc.fields.length > 0) {
      const company = await this.prisma.company.findFirst();
      pdfDoc.registerFontkit(fontkit);
      const fontBytes = await this.loadFont();
      const font = await pdfDoc.embedFont(fontBytes, { subset: false });
      await this.renderDocument(pdfDoc.getPage(0), doc, vehicle, company, font);
    }

    const bytes = await pdfDoc.save();
    return { bytes, label: doc.label };
  }

  /** 手続きに必要な書類一式を、対応しているものは自動入力しつつ1つのPDFに結合して返す */
  async generateBundle(bundleId: string, vehicleId: number): Promise<{ bytes: Uint8Array; label: string }> {
    const bundle = PROCEDURE_BUNDLES.find((b) => b.id === bundleId);

    if (!bundle) {
      throw new BadRequestException('手続きが見つかりません。');
    }

    const vehicle = await this.getVehicle(vehicleId);
    const company = await this.prisma.company.findFirst();
    const merged = await PDFDocument.create();

    // フォントは結合後のmergedに1回だけ埋め込む(書類ごとに埋め込むと、結合書類数に
    // 比例してPDFサイズが膨れ上がり、プレビューが極端に重くなっていたため)
    merged.registerFontkit(fontkit);
    const fontBytes = await this.loadFont();
    const sharedFont = await merged.embedFont(fontBytes, { subset: false });

    for (const documentId of bundle.documentIds) {
      const doc = getDocumentById(documentId);
      if (!doc) continue;

      try {
        const blankBytes = await this.loadBlankBytes(doc);
        const srcDoc = await PDFDocument.load(blankBytes, { ignoreEncryption: true });
        const [copiedPage] = await merged.copyPages(srcDoc, [0]);
        merged.addPage(copiedPage);

        if (doc.fields && doc.fields.length > 0) {
          await this.renderDocument(copiedPage, doc, vehicle, company, sharedFont);
        }
      } catch (err) {
        this.logger.warn(`書類の結合に失敗しました(${doc.id}): ${err}`);
      }
    }

    const bytes = await merged.save();
    return { bytes, label: bundle.label };
  }
}
