// backend/src/app.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';

import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './auth/tenant.middleware';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';

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
import { MaintenanceReminderTypeModule } from './maintenance-reminder-type/maintenance-reminder-type.module';
import { ReservationModule } from './reservation/reservation.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { ErrorReportModule } from './error-report/error-report.module';
import { TireMeasurementModule } from './tire-measurement/tire-measurement.module';
import { PortalModule } from './portal/portal.module';
import { PortalMiddleware } from './portal/portal.middleware';
import { CompetitorEstimateModule } from './competitor-estimate/competitor-estimate.module';
import { MarketingInquiryModule } from './marketing-inquiry/marketing-inquiry.module';
import { OfficialDocumentModule } from './official-document/official-document.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    TenantModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    ChatModule,

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
    MaintenanceReminderTypeModule,
    ReservationModule,
    GoogleCalendarModule,
    AnnouncementModule,
    ErrorReportModule,
    TireMeasurementModule,
    PortalModule,
    CompetitorEstimateModule,
    MarketingInquiryModule,
    OfficialDocumentModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
    consumer.apply(PortalMiddleware).forRoutes('portal');
  }
}