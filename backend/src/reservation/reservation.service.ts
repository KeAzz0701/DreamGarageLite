// backend/src/reservation/reservation.service.ts

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { createEvent, DateArray } from 'ics';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { BusinessHoursService } from './business-hours.service';
import { getEffectivePlanLimits } from '../common/plans';
import { KanaReadingService } from '../common/kana-reading.service';

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

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 指定した[startMinutes, endMinutes)が、休憩時間帯と重なるか */
function overlapsBreak(
  startMinutes: number,
  endMinutes: number,
  hours: { breakStartTime?: string | null; breakEndTime?: string | null },
): boolean {
  if (!hours.breakStartTime || !hours.breakEndTime) return false;

  const breakStart = toMinutes(hours.breakStartTime);
  const breakEnd = toMinutes(hours.breakEndTime);

  return startMinutes < breakEnd && endMinutes > breakStart;
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
    private readonly kanaReadingService: KanaReadingService,
  ) {}

  async list(status?: ReservationStatus) {
    return this.prisma.reservation.findMany({
      where: status ? { status } : undefined,
      include: { customer: true, vehicle: true },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  /** LINEの「予約確認」から使う。お客様本人の今後の予約(未確定含む)を取得する */
  async findUpcomingForCustomer(customerId: number) {
    return this.prisma.reservation.findMany({
      where: {
        customerId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: new Date() },
      },
      include: { vehicle: true },
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
    options?: { skipLeadTime?: boolean },
  ): Promise<string | null> {
    const { min, max } = await this.getBookableRange();

    if (!options?.skipLeadTime) {
      if (start < min) {
        return 'ご希望の日時は受付リードタイムに満たないため予約できません。';
      }

      if (start > max) {
        return 'ご希望の日時は受付可能期間を超えています。';
      }
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

      if (overlapsBreak(startMinutes, endMinutes, hours)) {
        return `休憩時間(${hours.breakStartTime}〜${hours.breakEndTime})は予約できません。`;
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

  /**
   * validateSlot()の重複チェックは作成直前の1回きりの読み取りなので、ほぼ同時に届いた
   * 2件のリクエスト(LINEの連打・電話予約の同時操作など)がどちらもすり抜けて
   * 同じ枠に2件登録されてしまう競合が起こり得る。ここでは重複再チェックと登録を
   * 単一のSerializableトランザクションにまとめることで、後勝ちの一方を確実に弾く。
   */
  private async createReservationAtomic(
    createData: Prisma.ReservationUncheckedCreateInput,
    start: Date,
    end: Date,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const overlap = await tx.reservation.findFirst({
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] },
              scheduledStart: { lt: end },
              scheduledEnd: { gt: start },
            },
          });

          if (overlap) {
            throw new BadRequestException('その時間帯はすでに予約が入っています。');
          }

          return tx.reservation.create({
            data: createData,
            include: { customer: true, vehicle: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
        // Serializable分離レベルでの書き込み競合。負けた側はやり直させる。
        throw new BadRequestException('その時間帯はすでに予約が入っています。');
      }
      throw e;
    }
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

      const slotStartMinutes = t.getHours() * 60 + t.getMinutes();
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

      if (overlapsBreak(slotStartMinutes, slotEndMinutes, hours)) continue;

      slots.push({
        start: t,
        end: slotEnd,
        label: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
      });
    }

    return slots;
  }

  /** 指定日の営業時間内の全コマを、空き/埋まりの状態付きで列挙する(LINEの時間帯○×表示用) */
  async getAllSlotsWithStatus(
    dateStr: string,
  ): Promise<{ start: Date; end: Date; label: string; available: boolean }[]> {
    const { min, max, slotMinutes } = await this.getBookableRange();

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const hours = await this.businessHoursService.getWeekday(date.getDay());

    if (!hours || hours.isClosed || !hours.startTime || !hours.endTime) {
      return [];
    }

    const closedDate = await this.prisma.closedDate.findUnique({ where: { date } });

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

    const slots: { start: Date; end: Date; label: string; available: boolean }[] = [];

    for (
      let t = new Date(dayStart);
      t.getTime() + slotMinutes * 60000 <= dayEnd.getTime();
      t = new Date(t.getTime() + slotMinutes * 60000)
    ) {
      const slotEnd = new Date(t.getTime() + slotMinutes * 60000);
      const slotStartMinutes = t.getHours() * 60 + t.getMinutes();
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

      const overlapReservation = existing.some(
        (r) => t < r.scheduledEnd && slotEnd > r.scheduledStart,
      );
      const inBreak = overlapsBreak(slotStartMinutes, slotEndMinutes, hours);
      const outOfRange = t < min || t > max;

      slots.push({
        start: t,
        end: slotEnd,
        label: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
        available: !overlapReservation && !inBreak && !outOfRange,
      });
    }

    return slots;
  }

  /**
   * 範囲内の各日について、空き具合を4段階で判定する(LINEカレンダー表示用)。
   * OPEN=十分空きあり、FEW=残りわずか、FULL=満枠、CLOSED=定休日/受付範囲外/休業日
   */
  async getAvailabilityByDate(
    min: Date,
    max: Date,
  ): Promise<Map<string, 'OPEN' | 'FEW' | 'FULL' | 'CLOSED'>> {
    const result = new Map<string, 'OPEN' | 'FEW' | 'FULL' | 'CLOSED'>();
    const { slotMinutes } = await this.getBookableRange();

    const cursor = new Date(min);
    cursor.setHours(0, 0, 0, 0);

    const lastDay = new Date(max);
    lastDay.setHours(0, 0, 0, 0);

    while (cursor <= lastDay) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      const hours = await this.businessHoursService.getWeekday(cursor.getDay());

      if (!hours || hours.isClosed || !hours.startTime || !hours.endTime) {
        result.set(dateStr, 'CLOSED');
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const dateOnly = new Date(cursor);
      const closedDate = await this.prisma.closedDate.findUnique({
        where: { date: dateOnly },
      });

      if (closedDate) {
        result.set(dateStr, 'CLOSED');
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const openMinutes = toMinutes(hours.startTime);
      const closeMinutes = toMinutes(hours.endTime);
      const breakMinutes =
        hours.breakStartTime && hours.breakEndTime
          ? Math.max(0, toMinutes(hours.breakEndTime) - toMinutes(hours.breakStartTime))
          : 0;

      const totalCapacity = Math.max(
        0,
        Math.floor((closeMinutes - openMinutes - breakMinutes) / slotMinutes),
      );

      const slots = await this.getOpenSlots(dateStr);

      if (totalCapacity === 0 || slots.length === 0) {
        result.set(dateStr, 'FULL');
      } else if (slots.length / totalCapacity < 0.34) {
        result.set(dateStr, 'FEW');
      } else {
        result.set(dateStr, 'OPEN');
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  /**
   * スタッフが電話対応中に見る月間カレンダー用。`getAvailabilityByDate`と異なり
   * 受付リードタイム・受付可能期間による制限は見ない(手動登録はその制限を受けないため、
   * 期間外の日を一律満枠扱いにしないようにする)。
   */
  async getMonthOverview(
    year: number,
    month: number,
  ): Promise<{ date: string; isClosed: boolean; reservationCount: number; isFull: boolean }[]> {
    const { slotMinutes } = await this.getBookableRange();

    const min = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const max = new Date(year, month, 0, 0, 0, 0, 0);
    const nextAfterMax = new Date(year, month, 1, 0, 0, 0, 0);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: min, lt: nextAfterMax },
      },
      select: { scheduledStart: true },
    });

    const dateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const counts = new Map<string, number>();

    for (const r of reservations) {
      const key = dateKey(r.scheduledStart);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const days: { date: string; isClosed: boolean; reservationCount: number; isFull: boolean }[] = [];
    const cursor = new Date(min);

    while (cursor <= max) {
      const dateStr = dateKey(cursor);
      const hours = await this.businessHoursService.getWeekday(cursor.getDay());

      const dateOnly = new Date(cursor);
      dateOnly.setHours(0, 0, 0, 0);
      const closedDate = await this.prisma.closedDate.findUnique({ where: { date: dateOnly } });

      const isClosed = !hours || hours.isClosed || Boolean(closedDate);
      const reservationCount = counts.get(dateStr) ?? 0;

      let isFull = false;

      if (!isClosed && hours?.startTime && hours?.endTime) {
        const breakMinutes =
          hours.breakStartTime && hours.breakEndTime
            ? Math.max(0, toMinutes(hours.breakEndTime) - toMinutes(hours.breakStartTime))
            : 0;
        const capacity = Math.max(
          0,
          Math.floor((toMinutes(hours.endTime) - toMinutes(hours.startTime) - breakMinutes) / slotMinutes),
        );
        isFull = capacity > 0 && reservationCount >= capacity;
      }

      days.push({ date: dateStr, isClosed, reservationCount, isFull });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  /**
   * スタッフが日付を選んだ後の時間帯一覧。`getAllSlotsWithStatus`と同じ考え方だが、
   * 受付リードタイム・受付可能期間による制限は見ない(電話予約はその場で当日枠にも
   * 登録できる必要があるため)。営業時間・休憩・定休日・臨時休業日・既存予約との
   * 重複のみ反映する。
   */
  async getDaySlotsForStaff(
    dateStr: string,
  ): Promise<{ start: Date; end: Date; label: string; occupied: boolean }[]> {
    const { slotMinutes } = await this.getBookableRange();

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const hours = await this.businessHoursService.getWeekday(date.getDay());

    if (!hours || hours.isClosed || !hours.startTime || !hours.endTime) {
      return [];
    }

    const closedDate = await this.prisma.closedDate.findUnique({ where: { date } });

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

    const slots: { start: Date; end: Date; label: string; occupied: boolean }[] = [];

    for (
      let t = new Date(dayStart);
      t.getTime() + slotMinutes * 60000 <= dayEnd.getTime();
      t = new Date(t.getTime() + slotMinutes * 60000)
    ) {
      const slotEnd = new Date(t.getTime() + slotMinutes * 60000);
      const slotStartMinutes = t.getHours() * 60 + t.getMinutes();
      const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

      const overlapReservation = existing.some(
        (r) => t < r.scheduledEnd && slotEnd > r.scheduledStart,
      );
      const inBreak = overlapsBreak(slotStartMinutes, slotEndMinutes, hours);

      slots.push({
        start: t,
        end: slotEnd,
        label: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
        occupied: overlapReservation || inBreak,
      });
    }

    return slots;
  }

  async createFromLineRequest(
    customerId: number,
    start: Date,
    category?: string | null,
    needsLoanerCar?: boolean | null,
  ) {
    const { slotMinutes } = await this.getBookableRange();
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    const error = await this.validateSlot(start, end);

    if (error) {
      throw new BadRequestException(error);
    }

    const reservation = await this.createReservationAtomic(
      {
        customerId,
        category: category || undefined,
        needsLoanerCar: needsLoanerCar ?? undefined,
        scheduledStart: start,
        scheduledEnd: end,
        status: 'PENDING',
        icsToken: randomIcsToken(this.tenantContext.current()!.company.companyCode),
      },
      start,
      end,
    );

    const vehicleLabel = reservation.vehicle
      ? [reservation.vehicle.carName, reservation.vehicle.commonModelName].filter(Boolean).join(' ')
      : '';

    await this.lineService.notifyStaffOfNewReservation({
      customerName: reservation.customer?.customerName ?? '不明',
      vehicleLabel,
      category: category || null,
      needsLoanerCar: needsLoanerCar ?? null,
      scheduledStart: reservation.scheduledStart,
    });

    return reservation;
  }

  /**
   * 予約管理画面(電話対応)からの手動登録。即「確定」扱いにしてLINE予約と同じ枠を埋める。
   * 受付リードタイム・受付可能期間は無視できる(当日・直近の枠にも登録可能)が、
   * 営業時間・休憩・定休日・臨時休業日・既存予約との重複は通常通りチェックする。
   */
  async createManual(data: {
    customerId?: number;
    customerName?: string;
    vehicleId?: number;
    scheduledStart: string;
    durationHours: number;
    staffNote?: string;
    category?: string;
  }) {
    let customerId = data.customerId;

    if (!customerId) {
      const name = (data.customerName ?? '').trim();

      if (!name) {
        throw new BadRequestException('顧客を選択するか、お客様のお名前を入力してください。');
      }

      const existing = await this.prisma.customer.findFirst({
        where: { customerName: name },
      });

      if (existing) {
        customerId = existing.id;
      } else {
        // 電話予約からの新規顧客登録もLINE経由と同様にプランの顧客登録上限を通す
        // (ここを素通りさせると上限のあるプランでも予約経由で無制限に顧客を追加できてしまう)
        const license = await this.prisma.license.findFirst();

        if (license) {
          const limits = getEffectivePlanLimits(
            license.plan,
            license.activatedAt,
            license.hasUsedPaidPlan,
          );

          if (limits.maxCustomers !== null) {
            const count = await this.prisma.customer.count();

            if (count >= limits.maxCustomers) {
              throw new BadRequestException(
                `顧客登録数の上限(${limits.maxCustomers}件)に達しています。プランのアップグレードが必要です。`,
              );
            }
          }
        }

        const customerNameReading = await this.kanaReadingService.getReading(name);

        customerId = (
          await this.prisma.customer.create({
            data: { customerName: name, customerNameReading },
          })
        ).id;
      }
    }

    const start = new Date(data.scheduledStart);
    const hours = Number(data.durationHours) > 0 ? Number(data.durationHours) : 1;
    const end = new Date(start.getTime() + hours * 3600 * 1000);

    const error = await this.validateSlot(start, end, undefined, { skipLeadTime: true });

    if (error) {
      throw new BadRequestException(error);
    }

    let reservation = await this.createReservationAtomic(
      {
        customerId,
        vehicleId: data.vehicleId ?? undefined,
        category: data.category || undefined,
        scheduledStart: start,
        scheduledEnd: end,
        staffNote: data.staffNote || undefined,
        status: 'CONFIRMED',
        icsToken: randomIcsToken(this.tenantContext.current()!.company.companyCode),
      },
      start,
      end,
    );

    reservation = await this.syncGoogleCalendar(reservation);

    await this.notifyLine(reservation.customer?.lineUserId, [
      {
        type: 'text',
        text:
          `✅ ご予約を承りました\n` +
          `${this.formatDateJst(reservation.scheduledStart)}\n` +
          `ご来店をお待ちしております。`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'uri',
                label: '📅 カレンダーに追加',
                uri: this.buildIcsUrl(reservation.icsToken),
              },
            },
          ],
        },
      },
    ]);

    return reservation;
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

  private toGoogleCalendarUtc(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * LINEのURIアクション(クイックリプライ)から開くリンク先。
   * .icsファイルを直接返すとLINEアプリ内ブラウザ(特にiOS)で真っ白画面になり開けないことがあるため、
   * 必ずまずHTMLページを表示し、そこからGoogleカレンダー追加リンク/iCalダウンロードへ誘導する。
   */
  buildAddToCalendarHtml(reservation: {
    scheduledStart: Date;
    scheduledEnd: Date;
    customer: { customerName: string } | null;
    vehicle: {
      carName: string | null;
      commonModelName: string | null;
      registrationNumber: string | null;
    } | null;
    icsToken: string;
  }): string {
    const vehicleName = [
      reservation.vehicle?.carName,
      reservation.vehicle?.commonModelName,
    ]
      .filter(Boolean)
      .join(' ');

    const details = [
      reservation.customer ? `お客様: ${reservation.customer.customerName}` : null,
      vehicleName ? `車両: ${vehicleName}` : null,
      reservation.vehicle?.registrationNumber
        ? `登録番号: ${reservation.vehicle.registrationNumber}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const googleUrl =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${encodeURIComponent('ご予約 - ガレージ・カルテ')}` +
      `&dates=${this.toGoogleCalendarUtc(reservation.scheduledStart)}/${this.toGoogleCalendarUtc(reservation.scheduledEnd)}` +
      `&details=${encodeURIComponent(details)}`;

    const dateLabel = this.formatDateJst(reservation.scheduledStart);
    const fileUrl = `${this.buildIcsUrl(reservation.icsToken)}/file`;

    return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>カレンダーに追加</title>
<style>
  body { font-family: sans-serif; padding: 24px; text-align: center; color: #333; }
  h1 { font-size: 18px; margin-bottom: 8px; }
  p { color: #666; font-size: 14px; margin-bottom: 24px; }
  a.btn { display: block; margin: 12px auto; max-width: 320px; padding: 14px; border-radius: 8px;
          text-decoration: none; font-weight: bold; }
  a.google { background: #4285F4; color: #fff; }
  a.ics { background: #f0f0f0; color: #333; }
</style>
</head>
<body>
  <h1>📅 ご予約日時</h1>
  <p>${dateLabel}</p>
  <a class="btn google" href="${googleUrl}" target="_blank" rel="noopener">Googleカレンダーに追加</a>
  <a class="btn ics" href="${fileUrl}">iCalファイルをダウンロード(iPhone純正カレンダー等)</a>
</body>
</html>`;
  }
}
