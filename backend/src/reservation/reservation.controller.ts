// backend/src/reservation/reservation.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { ReservationService } from './reservation.service';
import { ReservationReminderService } from './reservation-reminder.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { Public } from '../auth/public.decorator';

@Controller('reservation')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly reservationReminderService: ReservationReminderService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('reminders/run-now')
  async runRemindersNow() {
    return this.reservationReminderService.sendDayBeforeReminders();
  }

  @Get()
  async list(@Query('status') status?: ReservationStatus) {
    return this.reservationService.list(status);
  }

  @Get('availability')
  async availability(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date is required');
    }

    return this.reservationService.getAvailability(date);
  }

  @Get('month-overview')
  async monthOverview(@Query('year') year: string, @Query('month') month: string) {
    if (!year || !month) {
      throw new BadRequestException('year and month are required');
    }

    return this.reservationService.getMonthOverview(Number(year), Number(month));
  }

  @Get('day-slots')
  async daySlots(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date is required');
    }

    return this.reservationService.getDaySlotsForStaff(date);
  }

  @Post('manual')
  async createManual(
    @Body()
    body: {
      customerId?: number;
      customerName?: string;
      vehicleId?: number;
      scheduledStart: string;
      durationHours: number;
      staffNote?: string;
      category?: string;
    },
  ) {
    return this.reservationService.createManual(body);
  }

  /**
   * LINEのURIアクションから開くのはこちら(HTMLページ)。
   * .icsを直接返すとLINEアプリ内ブラウザ(特にiOS)で真っ白画面になり開けないことがあるため、
   * 案内ページを経由してGoogleカレンダー追加/iCalダウンロードへ誘導する。
   */
  @Public()
  @Get('ics/:token')
  async icsLanding(@Param('token') token: string, @Res() res: Response) {
    const reservation = await this.resolveByIcsToken(token);
    const html = this.reservationService.buildAddToCalendarHtml(reservation);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Public()
  @Get('ics/:token/file')
  async icsFile(@Param('token') token: string, @Res() res: Response) {
    const reservation = await this.resolveByIcsToken(token);
    const ics = this.reservationService.buildIcs(reservation);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reservation.ics"',
    );
    res.send(ics);
  }

  private async resolveByIcsToken(token: string) {
    const companyCode = token.split('.')[0];

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { companyCode },
    });

    if (!company || !company.isActive) {
      throw new NotFoundException();
    }

    return this.tenantContext.run(company, async () => {
      const reservation = await this.reservationService.getByIcsToken(token);

      if (!reservation) {
        throw new NotFoundException();
      }

      return reservation;
    });
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      scheduledStart?: string;
      scheduledEnd?: string;
      staffNote?: string;
    },
  ) {
    return this.reservationService.confirm(id, body ?? {});
  }

  @Patch(':id/reschedule')
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { scheduledStart: string; scheduledEnd?: string },
  ) {
    if (!body?.scheduledStart) {
      throw new BadRequestException('scheduledStart is required');
    }

    return this.reservationService.reschedule(
      id,
      body.scheduledStart,
      body.scheduledEnd,
    );
  }

  @Patch(':id/decline')
  async decline(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.reservationService.decline(id, body?.reason);
  }

  @Delete(':id')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.cancel(id);
  }
}
