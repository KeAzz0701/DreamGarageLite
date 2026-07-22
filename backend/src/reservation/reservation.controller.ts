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

  @Public()
  @Get('ics/:token')
  async ics(@Param('token') token: string, @Res() res: Response) {
    const companyCode = token.split('.')[0];

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { companyCode },
    });

    if (!company || !company.isActive) {
      throw new NotFoundException();
    }

    await this.tenantContext.run(company, async () => {
      const reservation = await this.reservationService.getByIcsToken(token);

      if (!reservation) {
        throw new NotFoundException();
      }

      const ics = this.reservationService.buildIcs(reservation);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reservation.ics"',
      );
      res.send(ics);
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
