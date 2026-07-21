// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';

import { PrismaModule } from './prisma/prisma.module';

import { GeminiModule } from './gemini/gemini.module';
import { OcrModule } from './ocr/ocr.module';

import { CustomerModule } from './customer/customer.module';
import { VehicleModule } from './vehicle/vehicle.module';

import { CompanyModule } from './company/company.module';
import { LicenseModule } from './license/license.module';
import { SettingsModule } from './settings/settings.module';
import { LineModule } from './line/line.module';
import { NotificationModule } from './notification/notification.module';
import { ServiceHistoryModule } from './service-history/service-history.module';
import { EstimateModule } from './estimate/estimate.module';
import { ExportModule } from './export/export.module';
import { FeeRateModule } from './fee-rate/fee-rate.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    PrismaModule,

    GeminiModule,
    OcrModule,

    CustomerModule,
    VehicleModule,

    CompanyModule,
    LicenseModule,
    SettingsModule,
    LineModule,
    NotificationModule,
    ServiceHistoryModule,
    EstimateModule,
    ExportModule,
    FeeRateModule,
  ],
  controllers: [AppController],
})
export class AppModule {}