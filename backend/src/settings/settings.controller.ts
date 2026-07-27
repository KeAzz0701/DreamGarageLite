// backend/src/settings/settings.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { SessionPayload } from '../auth/session.service';

const BANK_FIELDS = [
  'bankName',
  'bankBranchName',
  'bankAccountType',
  'bankAccountNumber',
  'bankAccountHolder',
];

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  @Get(':companyId')
  async get(
    @Param('companyId', ParseIntPipe)
    companyId: number,
  ) {
    return this.settingsService.initialize(companyId);
  }

  @Put(':companyId')
  async update(
    @Param('companyId', ParseIntPipe)
    companyId: number,
    @Body() body: any,
    @Req() req: Request & { staffSession?: SessionPayload },
  ) {
    // 振込先情報は社員には見せない方針のため、社員セッションからの更新では
    // 該当フィールドだけ黙って無視する(工賃・リマインド等の他項目は社員も編集可能)
    const safeBody = req.staffSession
      ? Object.fromEntries(
          Object.entries(body ?? {}).filter(([key]) => !BANK_FIELDS.includes(key)),
        )
      : body;

    return this.settingsService.update(
      companyId,
      safeBody,
    );
  }
}