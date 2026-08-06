// backend/src/maintenance-reminder-type/maintenance-reminder-type.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 新規会社の初期表示用デフォルト項目(会社ごとに追加・削除・改名・目安変更可能) */
const DEFAULT_REMINDER_TYPES: { name: string; intervalMonths: number; intervalKm: number }[] = [
  { name: 'オイル交換', intervalMonths: 6, intervalKm: 5000 },
  { name: 'タイヤ交換', intervalMonths: 48, intervalKm: 30000 },
];

@Injectable()
export class MaintenanceReminderTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.maintenanceReminderType.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** 会社にまだ1件も無い場合のみ、初期項目一式を作成する(既存項目の削除を上書きしないため) */
  async ensureDefaults() {
    const existingCount = await this.prisma.maintenanceReminderType.count();

    if (existingCount === 0) {
      await this.prisma.maintenanceReminderType.createMany({
        data: DEFAULT_REMINDER_TYPES.map((t, index) => ({
          name: t.name,
          intervalMonths: t.intervalMonths,
          intervalKm: t.intervalKm,
          sortOrder: index,
        })),
      });
    }

    return this.getAll();
  }

  async create(name: string, intervalMonths?: number, intervalKm?: number) {
    const trimmed = name.trim();

    if (!trimmed) {
      throw new BadRequestException('項目名を入力してください。');
    }

    const last = await this.prisma.maintenanceReminderType.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    try {
      return await this.prisma.maintenanceReminderType.create({
        data: {
          name: trimmed,
          intervalMonths: intervalMonths ?? undefined,
          intervalKm: intervalKm ?? undefined,
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

  async update(
    id: number,
    data: { name?: string; intervalMonths?: number | null; intervalKm?: number | null },
  ) {
    const trimmedName = data.name?.trim();

    if (data.name !== undefined && !trimmedName) {
      throw new BadRequestException('項目名を入力してください。');
    }

    try {
      return await this.prisma.maintenanceReminderType.update({
        where: { id },
        data: {
          name: trimmedName,
          intervalMonths: data.intervalMonths,
          intervalKm: data.intervalKm,
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
    await this.prisma.maintenanceReminderType.delete({ where: { id } });
    return { ok: true };
  }

  async reorder(orderedIds: number[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.maintenanceReminderType.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getAll();
  }
}
