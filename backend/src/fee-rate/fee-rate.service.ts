// backend/src/fee-rate/fee-rate.service.ts

import { Injectable } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** お店側で価格を管理する車検基本項目(法定費用のぞく) */
export const SHOP_SHAKEN_ITEMS = [
  '車両検査料',
  '点検料',
  '車検代行料',
  'ブレーキオイル交換料金',
  'オイル料金',
  'オイルエレメント交換料金',
];

@Injectable()
export class FeeRateService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.feeRate.findMany({
      orderBy: [{ vehicleCategory: 'asc' }, { itemName: 'asc' }],
    });
  }

  async upsert(vehicleCategory: VehicleCategory, itemName: string, price: number) {
    return this.prisma.feeRate.upsert({
      where: {
        vehicleCategory_itemName: { vehicleCategory, itemName },
      },
      update: { price },
      create: { vehicleCategory, itemName, price },
    });
  }

  /** 未登録の組み合わせがあれば0円で作成しておく(価格表の初期表示用) */
  async ensureDefaults() {
    const categories: VehicleCategory[] = ['KEI', 'REGULAR', 'LARGE', 'CARGO'];

    for (const category of categories) {
      for (const itemName of SHOP_SHAKEN_ITEMS) {
        await this.prisma.feeRate.upsert({
          where: {
            vehicleCategory_itemName: { vehicleCategory: category, itemName },
          },
          update: {},
          create: { vehicleCategory: category, itemName, price: 0 },
        });
      }
    }

    return this.getAll();
  }

  async getByCategory(vehicleCategory: VehicleCategory) {
    return this.prisma.feeRate.findMany({
      where: { vehicleCategory },
      orderBy: { itemName: 'asc' },
    });
  }
}
