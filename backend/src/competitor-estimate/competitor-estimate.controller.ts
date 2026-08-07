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
import { inferVehicleCategory } from '../common/vehicle-category';

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
      inferVehicleCategory(vehicle),
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

  /** 車検証OCRの下にある「見積書OCR」の入口。対象車両が定まっていない状態で解析だけ行い、
   * ナンバーが一致する既存車両があれば候補として返す(保存はまだしない) */
  @Post('ocr/competitor-estimate-lookup')
  @UseInterceptors(FileInterceptor('file'))
  async lookup(@UploadedFile() file: Express.Multer.File) {
    const companyAccountId = this.tenantContext.current()!.company.id;
    const apiKey = await this.licenseService.getApiKey(companyAccountId);

    return this.competitorEstimateService.analyzeOnly(file, apiKey ?? undefined);
  }

  /** lookupで確認した内容を、選ばれた車両に紐づけて保存する(AI解析はやり直さない) */
  @Post('ocr/competitor-estimate-save')
  @UseInterceptors(FileInterceptor('file'))
  async save(
    @UploadedFile() file: Express.Multer.File,
    @Body('vehicleId', ParseIntPipe) vehicleId: number,
    @Body('extracted') extractedJson: string,
  ) {
    let extracted: any = {};

    try {
      extracted = JSON.parse(extractedJson);
    } catch {
      throw new BadRequestException('解析結果の形式が不正です。');
    }

    return this.competitorEstimateService.createFromExtracted(
      vehicleId,
      extracted,
      file,
      'STAFF',
      true,
    );
  }

  /** 車種区分×項目カテゴリごとの他店舗見積の比較表(件数/平均/最小/最大) */
  @Get('competitor-estimates/comparison-table')
  async getComparisonTable() {
    return this.competitorEstimateService.getComparisonTable();
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
