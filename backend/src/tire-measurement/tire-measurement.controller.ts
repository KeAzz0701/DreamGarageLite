// backend/src/tire-measurement/tire-measurement.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TireMeasurementService } from './tire-measurement.service';

@Controller()
export class TireMeasurementController {
  constructor(
    private readonly tireMeasurementService: TireMeasurementService,
  ) {}

  @Post('vehicle/:vehicleId/tire-measurement')
  async create(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() body: any,
  ) {
    return this.tireMeasurementService.create(vehicleId, body);
  }

  @Get('vehicle/:vehicleId/tire-measurement')
  async getByVehicle(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.tireMeasurementService.getByVehicle(vehicleId);
  }

  @Patch('tire-measurement/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.tireMeasurementService.update(id, body);
  }

  @Delete('tire-measurement/:id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tireMeasurementService.delete(id);
  }
}
