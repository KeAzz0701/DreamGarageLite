// backend/src/estimate/estimate.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { EstimateService } from './estimate.service';

@Controller()
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

  /** 車両を選ばない/選べない見積作成(ホーム画面の「見積書作成」から) */
  @Post('estimates')
  async createStandalone(@Body() body: any) {
    return this.estimateService.createStandalone(body);
  }

  @Post('vehicle/:vehicleId/estimates')
  async create(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() body: any,
  ) {
    return this.estimateService.create(vehicleId, body);
  }

  @Post('vehicle/:vehicleId/estimates/suggest-shaken-items')
  async suggestShakenItems(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() body: { vehicleCategory: VehicleCategory },
  ) {
    return this.estimateService.suggestShakenItems(
      vehicleId,
      body.vehicleCategory,
    );
  }

  @Get('vehicle/:vehicleId/estimates')
  async getByVehicle(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.estimateService.getByVehicle(vehicleId);
  }

  @Get('estimates/:id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.estimateService.getById(id);
  }

  @Post('estimates/:id/convert-to-service-history')
  async convert(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.estimateService.convertToServiceHistory(id);
  }

  @Delete('estimates/:id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.estimateService.delete(id);
  }
}
