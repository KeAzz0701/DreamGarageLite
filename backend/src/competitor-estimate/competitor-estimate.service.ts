// backend/src/competitor-estimate/competitor-estimate.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

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
    file: { buffer: Buffer; mimetype: string },
    createdBy: 'STAFF' | 'CUSTOMER',
    sharedWithShop: boolean,
    apiKey?: string,
  ) {
    const base64 = file.buffer.toString('base64');

    let extracted: { shopName?: string; estimateDate?: string; items?: unknown; totalAmount?: number } = {};

    try {
      const text = await this.geminiService.analyzeCompetitorEstimate(base64, file.mimetype, apiKey);
      extracted = JSON.parse(text);
    } catch (err) {
      this.logger.warn(`他店舗見積のAI解析に失敗しました。画像のみ保存します: ${err}`);
    }

    return this.prisma.competitorEstimate.create({
      data: {
        vehicleId,
        customerId,
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
