// backend/src/export/export.controller.ts

import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  async exportExcel(@Res() res: Response) {
    const buffer = await this.exportService.buildWorkbook();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="garage-karte-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );

    res.send(buffer);
  }
}
