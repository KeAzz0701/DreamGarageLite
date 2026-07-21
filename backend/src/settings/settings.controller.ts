// backend/src/settings/settings.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { SettingsService } from './settings.service';

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
  ) {
    return this.settingsService.update(
      companyId,
      body,
    );
  }
}