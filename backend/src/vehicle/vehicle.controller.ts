// backend/src/vehicle/vehicle.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';

@Controller('vehicle')
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
  ) {}

  @Get()
  async getAll() {
    return this.vehicleService.getAll();
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vehicleService.getById(id);
  }

  @Get('vin/:vin')
  async getByVin(
    @Param('vin') vin: string,
  ) {
    return this.vehicleService.getByVin(vin);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.vehicleService.update(id, body);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vehicleService.delete(id);
  }
}