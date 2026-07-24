// backend/src/company/company.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { LineService } from '../line/line.service';
import { TenantContextService } from '../tenant/tenant-context.service';

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

  @Get('staff-line-info')
  async getStaffLineInfo() {
    const company = this.tenantContext.current()!.company;
    const joinCode = await this.lineService.ensureStaffJoinCode(company);

    return { joinCode };
  }

  @Post()
  async create(
    @Body() body: any,
  ) {
    return this.companyService.createCompany(body);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.companyService.updateCompany(id, body);
  }
}