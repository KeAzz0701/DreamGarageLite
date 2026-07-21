// backend/src/notification/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { parseFlexibleDate, daysUntil } from '../common/japanese-date';

const NOTIFY_THRESHOLDS = [30, 7, 0];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpirations() {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        expirationDate: { not: null },
        customer: {
          lineUserId: { not: null },
        },
      },
      include: {
        customer: true,
      },
    });

    let sent = 0;

    for (const vehicle of vehicles) {
      const date = parseFlexibleDate(vehicle.expirationDate);

      if (!date) continue;

      const remain = daysUntil(date);

      if (!NOTIFY_THRESHOLDS.includes(remain)) continue;

      const lineUserId = vehicle.customer?.lineUserId;

      if (!lineUserId) continue;

      const label =
        remain === 0
          ? '本日'
          : `残り${remain}日`;

      await this.lineService.pushMessage(lineUserId, [
        {
          type: 'text',
          text:
            `🚗 車検満了のお知らせ\n` +
            `${vehicle.carName ?? ''}${vehicle.commonModelName ? ' ' + vehicle.commonModelName : ''}` +
            `（${vehicle.registrationNumber ?? '登録番号未登録'}）\n` +
            `車検満了日: ${vehicle.expirationDate}（${label}）\n` +
            `お早めに整備工場へご連絡ください。`,
        },
      ]);

      sent++;
    }

    this.logger.log(`車検満了通知: ${sent}件送信`);

    return { checked: vehicles.length, sent };
  }
}
