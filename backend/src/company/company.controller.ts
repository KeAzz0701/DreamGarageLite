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

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) {}

  @Get()
  async getCompany() {
    return this.companyService.getCompany();
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