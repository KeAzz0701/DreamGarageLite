// backend/src/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { LicenseModule } from '../license/license.module';
import { ErrorReportModule } from '../error-report/error-report.module';
import { SystemAdminLineModule } from '../system-admin-line/system-admin-line.module';

@Module({
  imports: [LicenseModule, ErrorReportModule, SystemAdminLineModule],
  controllers: [AdminController],
  providers: [AdminService, AdminSessionService, AdminAuthGuard],
})
export class AdminModule {}
