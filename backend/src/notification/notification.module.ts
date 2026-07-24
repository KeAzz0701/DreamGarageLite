// backend/src/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';
import { ReservationModule } from '../reservation/reservation.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { StaffDigestService } from './staff-digest.service';

@Module({
  imports: [PrismaModule, LineModule, ReservationModule],
  controllers: [NotificationController],
  providers: [NotificationService, StaffDigestService],
})
export class NotificationModule {}
