// backend/src/app.controller.ts

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
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
      },

      serverTime: new Date(),
    };
  }
}