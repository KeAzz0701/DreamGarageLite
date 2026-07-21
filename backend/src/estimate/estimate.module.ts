// backend/src/estimate/estimate.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { LicenseModule } from '../license/license.module';
import { FeeRateModule } from '../fee-rate/fee-rate.module';
import { EstimateController } from './estimate.controller';
import { EstimateService } from './estimate.service';

@Module({
  imports: [PrismaModule, GeminiModule, LicenseModule, FeeRateModule],
  controllers: [EstimateController],
  providers: [EstimateService],
  exports: [EstimateService],
})
export class EstimateModule {}
