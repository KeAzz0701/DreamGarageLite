// backend/src/fee-rate/fee-rate.controller.ts

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { FeeRateService } from './fee-rate.service';

@Controller('fee-rates')
export class FeeRateController {
  constructor(private readonly feeRateService: FeeRateService) {}

  @Get()
  async getAll() {
    return this.feeRateService.ensureDefaults();
  }

  /** 新しい項目を追加する */
  @Post()
  async create(
    @Body()
    body: {
      vehicleCategory: VehicleCategory;
      itemName: string;
      price: number;
    },
  ) {
    return this.feeRateService.create(
      body.vehicleCategory,
      body.itemName,
      Number(body.price) || 0,
    );
  }

  /** 既存項目の名称・価格を更新する */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { itemName?: string; price?: number },
  ) {
    return this.feeRateService.update(id, {
      itemName: body.itemName,
      price: body.price === undefined ? undefined : Number(body.price) || 0,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.feeRateService.remove(id);
    return { ok: true };
  }

  @Post('reorder')
  async reorder(
    @Body() body: { vehicleCategory: VehicleCategory; orderedIds: number[] },
  ) {
    return this.feeRateService.reorder(body.vehicleCategory, body.orderedIds ?? []);
  }
}
