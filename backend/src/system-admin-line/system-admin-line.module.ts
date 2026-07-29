// backend/src/system-admin-line/system-admin-line.module.ts

import { Module } from '@nestjs/common';
import { SystemAdminLineService } from './system-admin-line.service';

@Module({
  providers: [SystemAdminLineService],
  exports: [SystemAdminLineService],
})
export class SystemAdminLineModule {}
