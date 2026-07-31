// backend/src/notification/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { parseFlexibleDate, daysUntil } from '../common/japanese-date';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

// 2ヶ月前・1ヶ月前は単発、2週間前からは当日まで毎日お知らせする
const NOTIFY_THRESHOLDS = new Set([60, 30]);
const DAILY_NOTIFY_FROM_DAYS = 14;

function shouldNotify(remain: number): boolean {
  return NOTIFY_THRESHOLDS.has(remain) || (remain >= 0 && remain <= DAILY_NOTIFY_FROM_DAYS);
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpirations() {
    const companies = await this.masterPrisma.companyAccount.findMany({
      where: { isActive: true },
    });

    let totalChecked = 0;
    let totalSent = 0;

    for (const company of companies) {
      const result = await this.tenantContext.run(company, () =>
        this.checkExpirationsForCurrentTenant(),
      );

      totalChecked += result.checked;
      totalSent += result.sent;
    }

    return { checked: totalChecked, sent: totalSent };
  }

  private async checkExpirationsForCurrentTenant() {
    const companyAccountId = this.tenantContext.current()!.company.id;

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        expirationDate: { not: null },
        customer: {
          lineUserId: { not: null },
        },
      },
      include: {
        customer: true,
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            scheduledStart: { gte: new Date() },
          },
        },
      },
    });

    let sent = 0;

    for (const vehicle of vehicles) {
      const date = parseFlexibleDate(vehicle.expirationDate);

      if (!date) continue;

      const remain = daysUntil(date);

      if (!shouldNotify(remain)) continue;

      // 既に予約が入っている、またはお客様が「通知を止める」を選んだ場合は送らない
      if (vehicle.reservations.length > 0) continue;
      if (vehicle.shakenReminderDismissedFor === vehicle.expirationDate) continue;

      const lineUserId = vehicle.customer?.lineUserId;

      if (!lineUserId) continue;

      const label =
        remain === 0
          ? '本日'
          : `残り${remain}日`;

      const headline =
        remain >= 45
          ? 'もう車検のご予約が取れます'
          : '車検満了のお知らせ';

      await this.lineService.pushMessage(lineUserId, [
        {
          type: 'text',
          text:
            `🚗 ${headline}\n` +
            `${vehicle.carName ?? ''}${vehicle.commonModelName ? ' ' + vehicle.commonModelName : ''}` +
            `（${vehicle.registrationNumber ?? '登録番号未登録'}）\n` +
            `車検満了日: ${vehicle.expirationDate}（${label}）\n` +
            `お早めに整備工場へご連絡ください。`,
          quickReply: this.lineService.buildShakenReminderQuickReply(vehicle.id, companyAccountId),
        },
      ]);

      sent++;
    }

    this.logger.log(`車検満了通知: ${sent}件送信`);

    return { checked: vehicles.length, sent };
  }
}
