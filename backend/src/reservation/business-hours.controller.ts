// backend/src/reservation/business-hours.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';

@Controller('business-hours')
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Get()
  async list() {
    return this.businessHoursService.list();
  }

  @Put()
  async update(@Body() body: { rows: any[] }) {
    return this.businessHoursService.update(body.rows ?? []);
  }

  @Get('closed-dates')
  async listClosedDates() {
    return this.businessHoursService.listClosedDates();
  }

  @Post('closed-dates')
  async addClosedDate(@Body() body: { date: string; reason?: string }) {
    return this.businessHoursService.addClosedDate(body.date, body.reason);
  }

  @Delete('closed-dates/:id')
  async removeClosedDate(@Param('id', ParseIntPipe) id: number) {
    return this.businessHoursService.removeClosedDate(id);
  }
}
