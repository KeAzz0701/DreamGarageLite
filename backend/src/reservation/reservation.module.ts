// backend/src/reservation/reservation.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';
import { ReservationReminderService } from './reservation-reminder.service';
import { KanaReadingService } from '../common/kana-reading.service';

@Module({
  imports: [PrismaModule, forwardRef(() => LineModule), forwardRef(() => GoogleCalendarModule)],
  controllers: [ReservationController, BusinessHoursController],
  providers: [ReservationService, BusinessHoursService, ReservationReminderService, KanaReadingService],
  exports: [ReservationService, BusinessHoursService],
})
export class ReservationModule {}
