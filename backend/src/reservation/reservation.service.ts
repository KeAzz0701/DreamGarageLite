// backend/src/reservation/reservation.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { createEvent, DateArray } from 'ics';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BusinessHoursService } from './business-hours.service';

const TOKEN_CHARS =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * icsトークンは会社コードをプレフィックスして "COMPANYCODE.ランダム文字列" の形にする。
 * ログインセッションなしで開かれる公開URL(/reservation/ics/:token)から、
 * どの会社のDBを見ればよいかをこのプレフィックスだけで判定できるようにするため。
 */
function randomIcsToken(companyCode: string, length = 24) {
  const random = Array.from(
    { length },
    () => TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)],
  ).join('');

  return `${companyCode}.${random}`;
}

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessHoursService: BusinessHoursService,
    @Inject(forwardRef(() => LineService))
    private readonly lineService: LineService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(status?: ReservationStatus) {
    return this.prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: { customer: true, vehicle: true },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async getById(id: number) {
    return this.prisma.reservation.findUnique({
      where: { id },
      include: { customer: true, vehicle: true },
    });
  }

  private async getSettings() {
    const company = await this.prisma.company.findFirst();

    if (!company) return null;

    return this.prisma.settings.findUnique({
      where: { companyId: company.id },
    });
  }

  async getBookableRange(): Promise<{
    min: Date;
    max: Date;
    slotMinutes: number;
  }> {
    const settings = await this.getSettings();

    const leadHours = settings?.reservationLeadHours ?? 24;
    const maxDays = settings?.reservationMaxAdvanceDays ?? 30;
    const slotMinutes = settings?.reservationSlotMinutes ?? 60;

    return {
      min: new Date(Date.now() + leadHours * 3600 * 1000),
      max: new Date(Date.now() + maxDays * 86400 * 1000),
      slotMinutes,
    };
  }

  /** 指定した開始/終了が予約可能な枠か検証し、不可なら理由文字列を返す(可なら null) */
  async validateSlot(
    start: Date,
    end: Date,
    excludeReservationId?: number,
  ): Promise<string | null> {
    const { min, max } = await this.getBookableRange();

    if (start < min) {
      return 'ご希望の日時は受付リードタイムに満たないため予約できません。';
    }

    if (start > max) {
      return 'ご希望の日時は受付可能期間を超えています。';
    }

    const hours = await this.businessHoursService.getWeekday(start.getDay());

    if (!hours || hours.isClosed) {
      return 'その曜日は定休日のため予約できません。';
    }

    if (hours.startTime && hours.endTime) {
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();

      const [openH, openM] = hours.startTime.split(':').map(Number);
      const [closeH, closeM] = hours.endTime.split(':').map(Number);

      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        return `営業時間(${hours.startTime}〜${hours.endTime})の範囲内でお選びください。`;
      }
    }

    const dateOnly = new Date(start);
    dateOnly.setHours(0, 0, 0, 0);

    const closedDate = await this.prisma.closedDate.findUnique({
      where: { date: dateOnly },
    });

    if (closedDate) {
      return 'その日は休業日のため予約できません。';
    }

    const overlap = await this.prisma.reservation.findFirst({
      where: {
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
    });

    if (overlap) {
      return 'その時間帯はすでに予約が入っています。';
    }

    return null;
  }

  /** 指定日の空き枠(スロット開始時刻)を、営業時間内で1コマ刻みに列挙する */
  async getOpenSlots(dateStr: string): Promise<{ start: Date; end: Date; label: string }[]> {
    const { min, max, slotMinutes } = await this.getBookableRange();

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const hours = await this.businessHoursService.getWeekday(date.getDay());

    if (!hours || hours.isClosed || !hours.startTime || !hours.endTime) {
      return [];
    }

    const closedDate = await this.prisma.closedDate.findUnique({
      where: { date },
    });

    if (closedDate) return [];

    const [openH, openM] = hours.startTime.split(':').map(Number);
    const [closeH, closeM] = hours.endTime.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(openH, openM, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(closeH, closeM, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const existing = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: date, lt: nextDate },
      },
    });

    const slots: { start: Date; end: Date; label: string }[] = [];

    for (
      let t = new Date(dayStart);
      t.getTime() + slotMinutes * 60000 <= dayEnd.getTime();
      t = new Date(t.getTime() + slotMinutes * 60000)
    ) {
      const slotEnd = new Date(t.getTime() + slotMinutes * 60000);

      if (t < min || t > max) continue;

      const overlap = existing.some(
        (r) => t < r.scheduledEnd && slotEnd > r.scheduledStart,
      );

      if (overlap) continue;

      slots.push({
        start: t,
        end: slotEnd,
        label: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
      });
    }

    return slots;
  }

  async createFromLineRequest(customerId: number, start: Date) {
    const { slotMinutes } = await this.getBookableRange();
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    const error = await this.validateSlot(start, end);

    if (error) {
      throw new BadRequestException(error);
    }

    return this.prisma.reservation.create({
      data: {
        customerId,
        scheduledStart: start,
        scheduledEnd: end,
        status: 'PENDING',
        icsToken: randomIcsToken(this.tenantContext.current()!.company.companyCode),
      },
      include: { customer: true, vehicle: true },
    });
  }

  async confirm(
    id: number,
    data: {
      scheduledStart?: string;
      scheduledEnd?: string;
      staffNote?: string;
    },
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    const newStart = data.scheduledStart
      ? new Date(data.scheduledStart)
      : reservation.scheduledStart;

    const newEnd = data.scheduledEnd
      ? new Date(data.scheduledEnd)
      : reservation.scheduledEnd;

    if (data.scheduledStart || data.scheduledEnd) {
      const error = await this.validateSlot(newStart, newEnd, id);

      if (error) {
        throw new BadRequestException(error);
      }
    }

    let updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        scheduledStart: newStart,
        scheduledEnd: newEnd,
        staffNote: data.staffNote,
      },
      include: { customer: true, vehicle: true },
    });

    updated = await this.syncGoogleCalendar(updated);

    await this.notifyLine(updated.customer?.lineUserId, [
      {
        type: 'text',
        text:
          `✅ ご予約が確定しました\n` +
          `${this.formatDateJst(updated.scheduledStart)}\n` +
          `ご来店をお待ちしております。`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: '📅 カレンダーに追加',
                uri: this.buildIcsUrl(updated.icsToken),
              },
            },
          ],
        },
      },
    ]);

    return updated;
  }

  /** 確定済み予約をGoogleカレンダーへ反映する。未連携時は何もしない(no-op) */
  private async syncGoogleCalendar<
    T extends {
      id: number;
      googleEventId: string | null;
      scheduledStart: Date;
      scheduledEnd: Date;
      staffNote: string | null;
      customer: { customerName: string } | null;
      vehicle: {
        carName: string | null;
        commonModelName: string | null;
        registrationNumber: string | null;
      } | null;
    },
  >(reservation: T): Promise<T> {
    if (reservation.googleEventId) {
      await this.googleCalendarService.updateEvent(
        reservation.googleEventId,
        reservation,
      );
      return reservation;
    }

    const googleEventId = await this.googleCalendarService.createEvent(
      reservation,
    );

    if (!googleEventId) return reservation;

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { googleEventId },
    });

    return { ...reservation, googleEventId };
  }

  private buildIcsUrl(icsToken: string) {
    const base = process.env.PUBLIC_API_URL ?? 'http://localhost:3001/api';
    return `${base}/reservation/ics/${icsToken}`;
  }

  async decline(id: number, reason?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'DECLINED', declineReason: reason },
      include: { customer: true, vehicle: true },
    });

    await this.notifyLine(updated.customer?.lineUserId, [
      {
        type: 'text',
        text:
          `申し訳ございません、ご希望の日時（${this.formatDateJst(updated.scheduledStart)}）は\n` +
          `お受けできませんでした。` +
          (reason ? `\n理由: ${reason}` : '') +
          `\nお手数ですが改めてご希望日時をお送りください。`,
      },
    ]);

    return updated;
  }

  /** 確定済み予約の日時を変更する(ステータスは変えない) */
  async reschedule(id: number, scheduledStart: string, scheduledEnd?: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    const { slotMinutes } = await this.getBookableRange();
    const start = new Date(scheduledStart);
    const end = scheduledEnd
      ? new Date(scheduledEnd)
      : new Date(start.getTime() + slotMinutes * 60000);

    const error = await this.validateSlot(start, end, id);

    if (error) {
      throw new BadRequestException(error);
    }

    let updated = await this.prisma.reservation.update({
      where: { id },
      data: { scheduledStart: start, scheduledEnd: end },
      include: { customer: true, vehicle: true },
    });

    updated = await this.syncGoogleCalendar(updated);

    await this.notifyLine(updated.customer?.lineUserId, [
      {
        type: 'text',
        text:
          `📅 ご予約日時が変更されました\n` +
          `${this.formatDateJst(updated.scheduledStart)}\n` +
          `ご確認をお願いいたします。`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: '📅 カレンダーに追加',
                uri: this.buildIcsUrl(updated.icsToken),
              },
            },
          ],
        },
      },
    ]);

    return updated;
  }

  private formatDateJst(date: Date) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const [datePart, timePart] = jst.toISOString().slice(0, 16).split('T');
    return `${datePart} ${timePart}`;
  }

  /** LINE送信失敗が確定/却下処理自体を壊さないよう握りつぶす */
  private async notifyLine(
    lineUserId: string | null | undefined,
    messages: Parameters<LineService['pushMessage']>[1],
  ) {
    if (!lineUserId) return;

    try {
      await this.lineService.pushMessage(lineUserId, messages);
    } catch (err) {
      this.logger.warn(`LINE通知の送信に失敗しました: ${err}`);
    }
  }

  async cancel(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new BadRequestException('Reservation not found');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { customer: true, vehicle: true },
    });

    if (reservation.googleEventId) {
      await this.googleCalendarService.deleteEvent(reservation.googleEventId);
    }

    if (reservation.status === 'CONFIRMED') {
      await this.notifyLine(updated.customer?.lineUserId, [
        {
          type: 'text',
          text:
            `ご予約（${this.formatDateJst(updated.scheduledStart)}）は\n` +
            `店舗都合によりキャンセルとなりました。\n` +
            `お手数をおかけし申し訳ございません。`,
        },
      ]);
    }

    return updated;
  }

  async getAvailability(dateStr: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const hours = await this.businessHoursService.getWeekday(date.getDay());

    const closedDate = await this.prisma.closedDate.findUnique({
      where: { date },
    });

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: date, lt: nextDate },
      },
      include: { customer: true, vehicle: true },
      orderBy: { scheduledStart: 'asc' },
    });

    return {
      businessHours: hours,
      isClosed: Boolean(closedDate) || (hours?.isClosed ?? false),
      closedReason: closedDate?.reason ?? null,
      reservations,
    };
  }

  async getByIcsToken(token: string) {
    return this.prisma.reservation.findUnique({
      where: { icsToken: token },
      include: { customer: true, vehicle: true },
    });
  }

  private toIcsDateArray(date: Date): DateArray {
    return [
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ];
  }

  buildIcs(reservation: {
    scheduledStart: Date;
    scheduledEnd: Date;
    customer: { customerName: string } | null;
    vehicle: {
      carName: string | null;
      commonModelName: string | null;
      registrationNumber: string | null;
    } | null;
  }): string {
    const vehicleName = [
      reservation.vehicle?.carName,
      reservation.vehicle?.commonModelName,
    ]
      .filter(Boolean)
      .join(' ');

    const { error, value } = createEvent({
      start: this.toIcsDateArray(reservation.scheduledStart),
      startInputType: 'utc',
      startOutputType: 'utc',
      end: this.toIcsDateArray(reservation.scheduledEnd),
      endInputType: 'utc',
      endOutputType: 'utc',
      title: 'ご予約 - ガレージ・カルテ',
      description: [
        reservation.customer
          ? `お客様: ${reservation.customer.customerName}`
          : null,
        vehicleName ? `車両: ${vehicleName}` : null,
        reservation.vehicle?.registrationNumber
          ? `登録番号: ${reservation.vehicle.registrationNumber}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    if (error || !value) {
      throw new BadRequestException('カレンダーファイルの生成に失敗しました');
    }

    return value;
  }
}
