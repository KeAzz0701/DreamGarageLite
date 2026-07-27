// backend/src/competitor-estimate/competitor-estimate.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { LicenseModule } from '../license/license.module';
import { CompetitorEstimateController } from './competitor-estimate.controller';
import { CompetitorEstimateService } from './competitor-estimate.service';

@Module({
  imports: [PrismaModule, GeminiModule, LicenseModule],
  controllers: [CompetitorEstimateController],
  providers: [CompetitorEstimateService],
  exports: [CompetitorEstimateService],
})
export class CompetitorEstimateModule {}
