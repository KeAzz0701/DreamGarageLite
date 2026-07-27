// backend/src/error-report/error-report.controller.ts

import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorReportService } from './error-report.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Controller('error-reports')
export class ErrorReportController {
  constructor(
    private readonly errorReportService: ErrorReportService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  async create(
    @Body() body: { pageUrl: string; pageLabel?: string; message?: string },
    @Req() req: Request,
  ) {
    const company = this.tenantContext.current()?.company;

    if (!company) {
      throw new BadRequestException('会社情報が取得できませんでした。');
    }

    if (!body?.pageUrl) {
      throw new BadRequestException('pageUrl is required');
    }

    return this.errorReportService.create({
      companyAccountId: company.id,
      companyName: company.displayName,
      pageUrl: body.pageUrl,
      pageLabel: body.pageLabel,
      message: body.message,
      userAgent: req.headers['user-agent'],
    });
  }
}
