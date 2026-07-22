// backend/src/reservation/reservation-reminder.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class ReservationReminderService {
  private readonly logger = new Logger(ReservationReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendDayBeforeReminders() {
    const companies = await this.masterPrisma.companyAccount.findMany({
      where: { isActive: true },
    });

    let totalChecked = 0;
    let totalSent = 0;

    for (const company of companies) {
      const result = await this.tenantContext.run(company, () =>
        this.sendForCurrentTenant(),
      );

      totalChecked += result.checked;
      totalSent += result.sent;
    }

    return { checked: totalChecked, sent: totalSent };
  }

  private async sendForCurrentTenant() {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSentAt: null,
        scheduledStart: { gte: tomorrowStart, lt: tomorrowEnd },
      },
      include: { customer: true },
    });

    let sent = 0;

    for (const reservation of reservations) {
      const lineUserId = reservation.customer?.lineUserId;

      if (!lineUserId) continue;

      const jst = new Date(
        reservation.scheduledStart.getTime() + 9 * 60 * 60 * 1000,
      );
      const [datePart, timePart] = jst.toISOString().slice(0, 16).split('T');

      try {
        await this.lineService.pushMessage(lineUserId, [
          {
            type: 'text',
            text:
              `📅 明日のご予約のお知らせ\n` +
              `${datePart} ${timePart}\n` +
              `ご来店をお待ちしております。`,
          },
        ]);

        sent++;
      } catch (err) {
        this.logger.warn(`リマインダー送信に失敗しました: ${err}`);
        continue;
      }

      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { reminderSentAt: new Date() },
      });
    }

    this.logger.log(`予約リマインダー: ${sent}件送信`);

    return { checked: reservations.length, sent };
  }
}
