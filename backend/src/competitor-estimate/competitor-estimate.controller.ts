// backend/src/competitor-estimate/competitor-estimate.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompetitorEstimateService } from './competitor-estimate.service';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from '../license/license.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Controller()
export class CompetitorEstimateController {
  constructor(
    private readonly competitorEstimateService: CompetitorEstimateService,
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('vehicle/:vehicleId/competitor-estimate')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle?.customerId) {
      throw new BadRequestException('顧客が紐づいていない車両には登録できません。');
    }

    const companyAccountId = this.tenantContext.current()!.company.id;
    const apiKey = await this.licenseService.getApiKey(companyAccountId);

    return this.competitorEstimateService.analyzeAndCreate(
      vehicleId,
      vehicle.customerId,
      file,
      'STAFF',
      true,
      apiKey ?? undefined,
    );
  }

  @Get('vehicle/:vehicleId/competitor-estimate')
  async getByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.competitorEstimateService.getByVehicle(vehicleId);
  }

  @Get('competitor-estimate/:id/image')
  async getImage(@Param('id', ParseIntPipe) id: number) {
    return this.competitorEstimateService.getImage(id);
  }

  @Delete('competitor-estimate/:id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.competitorEstimateService.delete(id);
  }
}
