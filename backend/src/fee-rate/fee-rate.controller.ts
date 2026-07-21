// backend/src/fee-rate/fee-rate.controller.ts

import { Body, Controller, Get, Post } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { FeeRateService } from './fee-rate.service';

@Controller('fee-rates')
export class FeeRateController {
  constructor(private readonly feeRateService: FeeRateService) {}

  @Get()
  async getAll() {
    return this.feeRateService.ensureDefaults();
  }

  @Post()
  async upsert(
    @Body()
    body: {
      vehicleCategory: VehicleCategory;
      itemName: string;
      price: number;
    },
  ) {
    return this.feeRateService.upsert(
      body.vehicleCategory,
      body.itemName,
      Number(body.price) || 0,
    );
  }
}
