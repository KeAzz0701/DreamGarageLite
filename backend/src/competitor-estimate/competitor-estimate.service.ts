// backend/src/competitor-estimate/competitor-estimate.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, string> = {
  KEI: '軽自動車',
  REGULAR: '普通乗用',
  LARGE: '大型・特殊',
  CARGO: '貨物自動車',
};

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
      select: { vehicleCategory: true, items: true },
    });

    type Bucket = {
      vehicleCategory: VehicleCategory;
      itemCategory: string;
      count: number;
      total: number;
      min: number;
      max: number;
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
        const existing = buckets.get(key);

        if (existing) {
          existing.count += 1;
          existing.total += cost;
          existing.min = Math.min(existing.min, cost);
          existing.max = Math.max(existing.max, cost);
        } else {
          buckets.set(key, {
            vehicleCategory: row.vehicleCategory,
            itemCategory,
            count: 1,
            total: cost,
            min: cost,
            max: cost,
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
