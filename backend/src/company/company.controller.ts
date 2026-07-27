// backend/src/company/company.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { LineService } from '../line/line.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly lineService: LineService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  async getCompany() {
    return this.companyService.getCompany();
  }

  @UseGuards(OwnerOnlyGuard)
  @Get('staff-line-info')
  async getStaffLineInfo() {
    const company = this.tenantContext.current()!.company;
    const joinCode = await this.lineService.ensureStaffJoinCode(company);

    return { joinCode };
  }

  @UseGuards(OwnerOnlyGuard)
  @Get('staff-line-links')
  async getStaffLineLinks() {
    const company = this.tenantContext.current()!.company;

    return this.lineService.listStaffLinks(company);
  }

  @UseGuards(OwnerOnlyGuard)
  @Delete('staff-line-links/:id')
  async removeStaffLineLink(@Param('id', ParseIntPipe) id: number) {
    const company = this.tenantContext.current()!.company;

    await this.lineService.removeStaffLink(company, id);
    return { ok: true };
  }

  @UseGuards(OwnerOnlyGuard)
  @Post('staff-line-links/:id/regenerate-code')
  async regenerateStaffAccessCode(@Param('id', ParseIntPipe) id: number) {
    const company = this.tenantContext.current()!.company;
    const staffAccessCode = await this.lineService.regenerateStaffAccessCode(company, id);

    return { staffAccessCode };
  }

  @Post()
  async create(
    @Body() body: any,
  ) {
    return this.companyService.createCompany(body);
  }

  @UseGuards(OwnerOnlyGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.companyService.updateCompany(id, body);
  }
}