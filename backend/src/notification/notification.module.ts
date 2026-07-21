// backend/src/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [PrismaModule, LineModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
