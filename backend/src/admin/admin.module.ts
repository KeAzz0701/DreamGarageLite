// backend/src/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSessionService } from './admin-session.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminSessionService, AdminAuthGuard],
})
export class AdminModule {}
