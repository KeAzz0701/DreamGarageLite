// backend/src/service-history/service-history.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ServiceHistoryService } from './service-history.service';

@Controller()
export class ServiceHistoryController {
  constructor(
    private readonly serviceHistoryService: ServiceHistoryService,
  ) {}

  @Post('vehicle/:vehicleId/service-history')
  async create(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() body: any,
  ) {
    return this.serviceHistoryService.create(vehicleId, body);
  }

  @Get('vehicle/:vehicleId/service-history')
  async getByVehicle(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.serviceHistoryService.getByVehicle(vehicleId);
  }

  @Delete('service-history/:id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.serviceHistoryService.delete(id);
  }

  @Post('service-history/:id/correct')
  async correct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.serviceHistoryService.correct(id, body);
  }
}
