// backend/src/maintenance-reminder-type/maintenance-reminder-type.controller.ts

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { MaintenanceReminderTypeService } from './maintenance-reminder-type.service';

@Controller('maintenance-reminder-types')
export class MaintenanceReminderTypeController {
  constructor(private readonly service: MaintenanceReminderTypeService) {}

  @Get()
  async getAll() {
    return this.service.ensureDefaults();
  }

  @Post()
  async create(
    @Body() body: { name: string; intervalMonths?: number; intervalKm?: number },
  ) {
    return this.service.create(
      body.name,
      body.intervalMonths != null ? Number(body.intervalMonths) : undefined,
      body.intervalKm != null ? Number(body.intervalKm) : undefined,
    );
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; intervalMonths?: number | null; intervalKm?: number | null },
  ) {
    return this.service.update(id, {
      name: body.name,
      intervalMonths:
        body.intervalMonths === undefined
          ? undefined
          : body.intervalMonths === null
            ? null
            : Number(body.intervalMonths),
      intervalKm:
        body.intervalKm === undefined
          ? undefined
          : body.intervalKm === null
            ? null
            : Number(body.intervalKm),
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('reorder')
  async reorder(@Body() body: { orderedIds: number[] }) {
    return this.service.reorder(body.orderedIds ?? []);
  }
}
