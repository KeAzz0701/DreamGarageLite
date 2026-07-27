// backend/src/fee-rate/fee-rate.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** 新規会社の初期表示用デフォルト項目(会社ごとに追加・削除・改名・並び替え可能) */
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
      orderBy: [{ vehicleCategory: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /** 既存項目の価格・名称を更新する(id指定。名称変更にも使う) */
  async update(id: number, data: { itemName?: string; price?: number }) {
    const trimmedName = data.itemName?.trim();

    if (data.itemName !== undefined && !trimmedName) {
      throw new BadRequestException('項目名を入力してください。');
    }

    try {
      return await this.prisma.feeRate.update({
        where: { id },
        data: {
          itemName: trimmedName,
          price: data.price,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('同じ名前の項目が既にあります。');
      }
      throw e;
    }
  }

  /** 新しい項目を末尾に追加する */
  async create(vehicleCategory: VehicleCategory, itemName: string, price: number) {
    const name = itemName.trim();

    if (!name) {
      throw new BadRequestException('項目名を入力してください。');
    }

    const last = await this.prisma.feeRate.findFirst({
      where: { vehicleCategory },
      orderBy: { sortOrder: 'desc' },
    });

    try {
      return await this.prisma.feeRate.create({
        data: {
          vehicleCategory,
          itemName: name,
          price,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new BadRequestException('同じ名前の項目が既にあります。');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.prisma.feeRate.delete({ where: { id } });
  }

  /** 車両区分内の並び順をまとめて書き換える */
  async reorder(vehicleCategory: VehicleCategory, orderedIds: number[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.feeRate.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getByCategory(vehicleCategory);
  }

  /** 会社にまだ1件も無い場合のみ、初期項目一式を作成する(既存項目の削除を上書きしないため) */
  async ensureDefaults() {
    const existingCount = await this.prisma.feeRate.count();

    if (existingCount === 0) {
      const categories: VehicleCategory[] = ['KEI', 'REGULAR', 'LARGE', 'CARGO'];

      for (const category of categories) {
        await this.prisma.feeRate.createMany({
          data: SHOP_SHAKEN_ITEMS.map((itemName, index) => ({
            vehicleCategory: category,
            itemName,
            price: 0,
            sortOrder: index,
          })),
        });
      }
    }

    return this.getAll();
  }

  async getByCategory(vehicleCategory: VehicleCategory) {
    return this.prisma.feeRate.findMany({
      where: { vehicleCategory },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
