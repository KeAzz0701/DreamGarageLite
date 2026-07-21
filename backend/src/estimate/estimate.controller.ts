// backend/src/estimate/estimate.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { EstimateService } from './estimate.service';

@Controller()
export class EstimateController {
  constructor(private readonly estimateService: EstimateService) {}

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
    @Headers('x-company-id') companyId: string,
  ) {
    return this.estimateService.suggestShakenItems(
      vehicleId,
      body.vehicleCategory,
      Number(companyId),
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
