// backend/src/ocr/ocr.module.ts

import { Module } from '@nestjs/common';

import { OcrController } from './ocr.controller';

import { GeminiModule } from '../gemini/gemini.module';
import { CustomerModule } from '../customer/customer.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [
    GeminiModule,
    CustomerModule,
    VehicleModule,
    PrismaModule,
    LicenseModule,
  ],
  controllers: [OcrController],
})
export class OcrModule {}