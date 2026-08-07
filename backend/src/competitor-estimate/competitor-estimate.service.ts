// backend/src/competitor-estimate/competitor-estimate.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { inferVehicleCategory } from '../common/vehicle-category';

const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, string> = {
  KEI: '軽自動車',
  REGULAR: '普通乗用',
  LARGE: '大型・特殊',
  CARGO: '貨物自動車',
};

/** ナンバー表記の空白・全角/半角差を吸収して比較するための正規化 */
function normalizeRegistrationNumber(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.replace(/\s+/g, '').replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0),
  );

  return trimmed || null;
}

@Injectable()
export class CompetitorEstimateService {
  private readonly logger = new Logger(CompetitorEstimateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  /** 写真をAIで解析し、他店舗見積として保存する */
  async analyzeAndCreate(
    vehicleId: number,
    customerId: number,
    vehicleCategory: VehicleCategory,
    file: { buffer: Buffer; mimetype: string },
    createdBy: 'STAFF' | 'CUSTOMER',
    sharedWithShop: boolean,
    apiKey?: string,
  ) {
    const extracted = await this.analyze(file, apiKey);

    return this.persist(vehicleId, customerId, vehicleCategory, file, extracted, createdBy, sharedWithShop);
  }

  /** 写真をAIで解析するだけ(保存はしない)。まだ対象車両が定まっていない入り口(車検証OCRの下の
   * 「見積書OCR」)から使う。ナンバーが読み取れれば既存車両を検索して候補として一緒に返す */
  async analyzeOnly(file: { buffer: Buffer; mimetype: string }, apiKey?: string) {
    const extracted = await this.analyze(file, apiKey);

    const normalized = normalizeRegistrationNumber(extracted.registrationNumber);
    let matches: {
      vehicleId: number;
      customerId: number;
      customerName: string;
      vehicleLabel: string;
      registrationNumber: string | null;
    }[] = [];

    if (normalized) {
      const candidates = await this.prisma.vehicle.findMany({
        where: { registrationNumber: { not: null }, customerId: { not: null } },
        select: {
          id: true,
          customerId: true,
          carName: true,
          commonModelName: true,
          registrationNumber: true,
          customer: { select: { customerName: true } },
        },
      });

      matches = candidates
        .filter((v) => normalizeRegistrationNumber(v.registrationNumber) === normalized)
        .map((v) => ({
          vehicleId: v.id,
          customerId: v.customerId!,
          customerName: v.customer?.customerName ?? '(顧客名不明)',
          vehicleLabel: [v.carName, v.commonModelName].filter(Boolean).join(' ') || '車両',
          registrationNumber: v.registrationNumber,
        }));
    }

    return { extracted, matches };
  }

  /** analyzeOnlyで抽出済みのデータを使って、選ばれた車両に紐づけて保存する(AI解析はやり直さない) */
  async createFromExtracted(
    vehicleId: number,
    extracted: { shopName?: string; estimateDate?: string; items?: unknown; totalAmount?: number },
    file: { buffer: Buffer; mimetype: string },
    createdBy: 'STAFF' | 'CUSTOMER',
    sharedWithShop: boolean,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle?.customerId) {
      throw new BadRequestException('顧客が紐づいていない車両には登録できません。');
    }

    return this.persist(
      vehicleId,
      vehicle.customerId,
      inferVehicleCategory(vehicle),
      file,
      extracted,
      createdBy,
      sharedWithShop,
    );
  }

  private async analyze(
    file: { buffer: Buffer; mimetype: string },
    apiKey?: string,
  ): Promise<{
    shopName?: string;
    estimateDate?: string;
    registrationNumber?: string;
    items?: unknown;
    totalAmount?: number;
  }> {
    const base64 = file.buffer.toString('base64');

    try {
      const text = await this.geminiService.analyzeCompetitorEstimate(base64, file.mimetype, apiKey);
      return JSON.parse(text);
    } catch (err) {
      this.logger.warn(`他店舗見積のAI解析に失敗しました。画像のみ保存します: ${err}`);
      return {};
    }
  }

  private persist(
    vehicleId: number,
    customerId: number,
    vehicleCategory: VehicleCategory,
    file: { buffer: Buffer; mimetype: string },
    extracted: { shopName?: string; estimateDate?: string; items?: unknown; totalAmount?: number },
    createdBy: 'STAFF' | 'CUSTOMER',
    sharedWithShop: boolean,
  ) {
    return this.prisma.competitorEstimate.create({
      data: {
        vehicleId,
        customerId,
        vehicleCategory,
        imageData: Buffer.from(file.buffer),
        mimeType: file.mimetype,
        shopName: extracted.shopName || undefined,
        estimateDate: extracted.estimateDate || undefined,
        items: (extracted.items as any) ?? undefined,
        totalAmount: extracted.totalAmount != null ? Number(extracted.totalAmount) : undefined,
        createdBy,
        sharedWithShop,
      },
      select: {
        id: true,
        shopName: true,
        estimateDate: true,
        items: true,
        totalAmount: true,
        createdBy: true,
        sharedWithShop: true,
        createdAt: true,
      },
    });
  }

  /**
   * 共有された他店舗見積を、車種区分×項目カテゴリごとに件数/平均/最小/最大へ集計する。
   * itemsはAIが自由に付けたcategory文字列を含むJSONのため、SQLでの集計ではなくここでまとめる
   */
  async getComparisonTable() {
    const rows = await this.prisma.competitorEstimate.findMany({
      where: { sharedWithShop: true, vehicleCategory: { not: null } },
      select: { vehicleCategory: true, items: true, shopName: true, estimateDate: true },
    });

    type Entry = {
      name: string;
      cost: number;
      shopName: string | null;
      estimateDate: string | null;
    };

    type Bucket = {
      vehicleCategory: VehicleCategory;
      itemCategory: string;
      count: number;
      total: number;
      min: number;
      max: number;
      entries: Entry[];
    };

    const buckets = new Map<string, Bucket>();

    for (const row of rows) {
      if (!row.vehicleCategory || !Array.isArray(row.items)) continue;

      for (const item of row.items as any[]) {
        const cost = Number(item?.cost);
        if (!Number.isFinite(cost) || cost <= 0) continue;

        const itemCategory =
          typeof item?.category === 'string' && item.category ? item.category : 'その他';
        const key = `${row.vehicleCategory}|${itemCategory}`;
        const entry: Entry = {
          name: typeof item?.name === 'string' && item.name ? item.name : itemCategory,
          cost,
          shopName: row.shopName ?? null,
          estimateDate: row.estimateDate ?? null,
        };
        const existing = buckets.get(key);

        if (existing) {
          existing.count += 1;
          existing.total += cost;
          existing.min = Math.min(existing.min, cost);
          existing.max = Math.max(existing.max, cost);
          existing.entries.push(entry);
        } else {
          buckets.set(key, {
            vehicleCategory: row.vehicleCategory,
            itemCategory,
            count: 1,
            total: cost,
            min: cost,
            max: cost,
            entries: [entry],
          });
        }
      }
    }

    return Array.from(buckets.values())
      .map((b) => ({
        vehicleCategory: b.vehicleCategory,
        vehicleCategoryLabel: VEHICLE_CATEGORY_LABEL[b.vehicleCategory],
        itemCategory: b.itemCategory,
        count: b.count,
        avgCost: Math.round(b.total / b.count),
        minCost: b.min,
        maxCost: b.max,
        entries: b.entries.sort((a, c) => a.cost - c.cost),
      }))
      .sort(
        (a, b) =>
          a.vehicleCategory.localeCompare(b.vehicleCategory) || b.count - a.count,
      );
  }

  /** スタッフ側: 車両に紐づく、共有された他店舗見積の一覧(顧客が非共有にしたものは出さない) */
  async getByVehicle(vehicleId: number) {
    return this.prisma.competitorEstimate.findMany({
      where: { vehicleId, sharedWithShop: true },
      select: {
        id: true,
        shopName: true,
        estimateDate: true,
        items: true,
        totalAmount: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 顧客側(ポータル): 自分の全件(非共有含む) */
  async getByCustomer(customerId: number) {
    return this.prisma.competitorEstimate.findMany({
      where: { customerId },
      select: {
        id: true,
        vehicleId: true,
        shopName: true,
        estimateDate: true,
        items: true,
        totalAmount: true,
        createdBy: true,
        sharedWithShop: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getImage(id: number) {
    const record = await this.prisma.competitorEstimate.findUnique({
      where: { id },
      select: { imageData: true, mimeType: true },
    });

    if (!record) {
      throw new BadRequestException('見積が見つかりませんでした。');
    }

    return {
      imageBase64: Buffer.from(record.imageData).toString('base64'),
      mimeType: record.mimeType,
    };
  }

  /** ポータル用: 自分(customerId)の見積の画像だけを返す。他人のIDを指定されても弾く */
  async getImageForCustomer(id: number, customerId: number) {
    const record = await this.prisma.competitorEstimate.findUnique({
      where: { id },
      select: { imageData: true, mimeType: true, customerId: true },
    });

    if (!record || record.customerId !== customerId) {
      throw new BadRequestException('見積が見つかりませんでした。');
    }

    return {
      imageBase64: Buffer.from(record.imageData).toString('base64'),
      mimeType: record.mimeType,
    };
  }

  async delete(id: number) {
    return this.prisma.competitorEstimate.delete({ where: { id } });
  }
}
