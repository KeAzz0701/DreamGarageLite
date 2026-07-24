// backend/src/notification/staff-digest.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { CompanyAccount } from '.prisma/master-client';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BusinessHoursService } from '../reservation/business-hours.service';

/** 社員用LINEに、毎朝6時ごろ本日の予約と車検案内(2ヶ月以内)をまとめて送る */
@Injectable()
export class StaffDigestService {
  private readonly logger = new Logger(StaffDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly businessHoursService: BusinessHoursService,
  ) {}

  @Cron('0 6 * * *')
  async sendDailyDigest() {
    const companies = await this.masterPrisma.companyAccount.findMany({
      where: { isActive: true },
    });

    let totalSent = 0;

    for (const company of companies) {
      const sent = await this.tenantContext.run(company, () =>
        this.sendForCurrentTenant(company),
      );

      totalSent += sent;
    }

    return { sent: totalSent };
  }

  private async sendForCurrentTenant(company: CompanyAccount): Promise<number> {
    const staffLinks = await this.masterPrisma.lineStaffLink.findMany({
      where: { companyAccountId: company.id },
    });

    if (staffLinks.length === 0) return 0;

    const isBusinessDay = await this.businessHoursService.isBusinessDay(new Date());

    if (!isBusinessDay) {
      this.logger.log(`${company.displayName}: 本日は休業日のため毎朝の通知をスキップ`);
      return 0;
    }

    const text = await this.buildDigestText();

    let sent = 0;

    for (const link of staffLinks) {
      try {
        await this.lineService.pushMessage(
          link.lineUserId,
          [{ type: 'text', text }],
          undefined,
          true,
        );

        sent++;
      } catch (err) {
        this.logger.warn(`社員向け通知の送信に失敗しました: ${err}`);
      }
    }

    this.logger.log(`${company.displayName}: 社員${sent}名に毎朝の通知を送信`);

    return sent;
  }

  private async buildDigestText(): Promise<string> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: todayStart, lt: todayEnd },
      },
      include: { customer: true, vehicle: true },
      orderBy: { scheduledStart: 'asc' },
    });

    const lines: string[] = ['🔧 おはようございます、本日の業務案内です'];

    lines.push('\n📅 本日のご予約');

    if (reservations.length === 0) {
      lines.push('本日の予約はありません。');
    } else {
      for (const r of reservations) {
        const jst = new Date(r.scheduledStart.getTime() + 9 * 60 * 60 * 1000);
        const time = jst.toISOString().slice(11, 16);
        const vehicleLabel = r.vehicle
          ? [r.vehicle.carName, r.vehicle.commonModelName].filter(Boolean).join(' ')
          : '';
        const statusLabel = r.status === 'CONFIRMED' ? '確定' : '未確定';
        const categoryLabel = r.category ? `[${r.category}] ` : '';

        lines.push(
          `${time} ${categoryLabel}${r.customer?.customerName ?? '不明'}様 ${vehicleLabel}（${statusLabel}）`,
        );
      }
    }

    const candidates = await this.lineService.getShakenReminderCandidates();

    lines.push('\n🚗 車検満了日が2ヶ月以内のお客様');

    if (candidates.length === 0) {
      lines.push('該当するお客様はいません。');
    } else {
      for (const c of candidates) {
        lines.push(
          `・${c.customerName}様 ${c.vehicleLabel}（${c.registrationNumber ?? '登録番号未登録'}）\n` +
            `  車検満了: ${c.expirationDate} / TEL: ${c.phone ?? '未登録'} / 住所: ${c.address ?? '未登録'}`,
        );
      }
    }

    return lines.join('\n');
  }
}
