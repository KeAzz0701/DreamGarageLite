// backend/src/fee-rate/fee-rate.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeeRateController } from './fee-rate.controller';
import { FeeRateService } from './fee-rate.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeeRateController],
  providers: [FeeRateService],
  exports: [FeeRateService],
})
export class FeeRateModule {}
