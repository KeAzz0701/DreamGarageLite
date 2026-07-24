// backend/src/line/line.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { CustomerModule } from '../customer/customer.module';
import { ReservationModule } from '../reservation/reservation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    forwardRef(() => ReservationModule),
    PrismaModule,
    GeminiModule,
    OpenRouterModule,
  ],
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService],
})
export class LineModule {}
