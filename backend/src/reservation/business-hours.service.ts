// backend/src/reservation/business-hours.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_HOURS = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  isClosed: weekday === 0,
  startTime: weekday === 0 ? null : '09:00',
  endTime: weekday === 0 ? null : '18:00',
}));

@Injectable()
export class BusinessHoursService {
  constructor(private readonly prisma: PrismaService) {}

  /** 7曜日分の行が揃っていなければ不足分をデフォルト値で補って返す */
  async list() {
    const existing = await this.prisma.businessHours.findMany({
      orderBy: { weekday: 'asc' },
    });

    if (existing.length === 7) {
      return existing;
    }

    const existingWeekdays = new Set(existing.map((h) => h.weekday));
    const missing = DEFAULT_HOURS.filter((h) => !existingWeekdays.has(h.weekday));

    if (missing.length > 0) {
      await this.prisma.businessHours.createMany({ data: missing });
    }

    return this.prisma.businessHours.findMany({ orderBy: { weekday: 'asc' } });
  }

  async getWeekday(weekday: number) {
    const rows = await this.list();
    return rows.find((r) => r.weekday === weekday) ?? null;
  }

  async update(
    rows: {
      weekday: number;
      isClosed: boolean;
      startTime?: string | null;
      endTime?: string | null;
      breakStartTime?: string | null;
      breakEndTime?: string | null;
    }[],
  ) {
    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.businessHours.upsert({
          where: { weekday: row.weekday },
          update: {
            isClosed: row.isClosed,
            startTime: row.isClosed ? null : row.startTime,
            endTime: row.isClosed ? null : row.endTime,
            breakStartTime: row.isClosed ? null : row.breakStartTime || null,
            breakEndTime: row.isClosed ? null : row.breakEndTime || null,
          },
          create: {
            weekday: row.weekday,
            isClosed: row.isClosed,
            startTime: row.isClosed ? null : row.startTime,
            endTime: row.isClosed ? null : row.endTime,
            breakStartTime: row.isClosed ? null : row.breakStartTime || null,
            breakEndTime: row.isClosed ? null : row.breakEndTime || null,
          },
        }),
      ),
    );

    return this.list();
  }

  async listClosedDates() {
    return this.prisma.closedDate.findMany({ orderBy: { date: 'asc' } });
  }

  async addClosedDate(dateStr: string, reason?: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    return this.prisma.closedDate.upsert({
      where: { date },
      update: { reason },
      create: { date, reason },
    });
  }

  async removeClosedDate(id: number) {
    return this.prisma.closedDate.delete({ where: { id } });
  }

  /** 指定日が営業日か(定休日・臨時休業日でないか)を判定する */
  async isBusinessDay(date: Date): Promise<boolean> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const hours = await this.getWeekday(dateOnly.getDay());

    if (!hours || hours.isClosed) return false;

    const closedDate = await this.prisma.closedDate.findUnique({
      where: { date: dateOnly },
    });

    return !closedDate;
  }

  /** 「今まさに」営業時間内かを判定する(休憩時間は除外しない。短時間の離席で緊急連絡先を
   * 案内してしまわないようにするため、始業〜終業の範囲内であればtrueとする) */
  async isWithinBusinessHoursNow(): Promise<boolean> {
    const now = new Date();

    if (!(await this.isBusinessDay(now))) return false;

    const hours = await this.getWeekday(now.getDay());

    if (!hours?.startTime || !hours?.endTime) return false;

    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return nowMinutes >= toMinutes(hours.startTime) && nowMinutes < toMinutes(hours.endTime);
  }
}
