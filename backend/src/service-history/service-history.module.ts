// backend/src/service-history/service-history.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceHistoryController } from './service-history.controller';
import { ServiceHistoryService } from './service-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceHistoryController],
  providers: [ServiceHistoryService],
  exports: [ServiceHistoryService],
})
export class ServiceHistoryModule {}
