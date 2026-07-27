// backend/src/tire-measurement/tire-measurement.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TireMeasurementController } from './tire-measurement.controller';
import { TireMeasurementService } from './tire-measurement.service';

@Module({
  imports: [PrismaModule],
  controllers: [TireMeasurementController],
  providers: [TireMeasurementService],
  exports: [TireMeasurementService],
})
export class TireMeasurementModule {}
