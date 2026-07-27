// backend/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { LicenseService } from './license/license.service';
import { VehicleService } from './vehicle/vehicle.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
    private readonly vehicleService: VehicleService,
  ) {}

  @Get()
  async health() {
    const customerCount =
      await this.prisma.customer.count();

    const vehicleCount =
      await this.prisma.vehicle.count();

    const companyCount =
      await this.prisma.company.count();

    const licenseCount =
      await this.prisma.license.count();

    const unreadLineMessages =
      await this.prisma.lineMessage.count({
        where: { direction: 'IN', readAt: null },
      });

    const pendingOcrSubmissions =
      await this.prisma.lineOcrSubmission.count({
        where: { status: 'PENDING' },
      });

    // LINE予約通知は有料プラン限定(無料版は初月お試しのみ、デモは常時)
    const limits = await this.licenseService.getCurrentPlanLimits();
    const pendingReservations =
      !limits || limits.reservationNotifications
        ? await this.prisma.reservation.count({ where: { status: 'PENDING' } })
        : null;

    // 車検リマインドは無料版含む全プランで利用可能
    const shakenReminders = await this.vehicleService.getShakenReminders();

    return {
      status: 'OK',
      system: 'Dream Garage Lite',
      version: '1.0.0',

      database: 'Connected',

      summary: {
        companies: companyCount,
        customers: customerCount,
        vehicles: vehicleCount,
        licenses: licenseCount,
        unreadLineMessages,
        pendingOcrSubmissions,
        pendingReservations,
        pendingShakenReminders: shakenReminders.length,
      },

      serverTime: new Date(),
    };
  }
}