// backend/src/maintenance-reminder-type/maintenance-reminder-type.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceReminderTypeController } from './maintenance-reminder-type.controller';
import { MaintenanceReminderTypeService } from './maintenance-reminder-type.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceReminderTypeController],
  providers: [MaintenanceReminderTypeService],
  exports: [MaintenanceReminderTypeService],
})
export class MaintenanceReminderTypeModule {}
