// backend/src/official-document/official-document.controller.ts

import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OfficialDocumentService } from './official-document.service';

@Controller()
export class OfficialDocumentController {
  constructor(private readonly officialDocumentService: OfficialDocumentService) {}

  /** カテゴリ別の全書類一覧(自動入力対応の有無を含む) */
  @Get('official-documents')
  async list() {
    return this.officialDocumentService.listDocuments();
  }

  /** 手続き別(継続検査・名義変更等)の必要書類一式 */
  @Get('official-documents/bundles')
  async listBundles() {
    return this.officialDocumentService.listBundles();
  }

  /** 白紙の様式をそのままダウンロード */
  @Get('official-documents/:id/blank')
  async getBlank(@Param('id') id: string, @Res() res: Response) {
    const { bytes, label } = await this.officialDocumentService.getBlankPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(label)}.pdf"`);
    res.send(Buffer.from(bytes));
  }

  /** 指定した車両の情報で(対応していれば)自動入力した書類1件 */
  @Get('vehicle/:vehicleId/official-documents/:id')
  async getFilled(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { bytes, label } = await this.officialDocumentService.generateSingleDocument(id, vehicleId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(label)}.pdf"`);
    res.send(Buffer.from(bytes));
  }

  /** 手続きに必要な書類一式を1つのPDFにまとめて(対応しているものは自動入力して)返す */
  @Get('vehicle/:vehicleId/official-documents/bundles/:bundleId')
  async getBundle(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Param('bundleId') bundleId: string,
    @Res() res: Response,
  ) {
    const { bytes, label } = await this.officialDocumentService.generateBundle(bundleId, vehicleId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(label)}.pdf"`);
    res.send(Buffer.from(bytes));
  }
}
