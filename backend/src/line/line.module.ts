// backend/src/line/line.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { CustomerModule } from '../customer/customer.module';
import { ReservationModule } from '../reservation/reservation.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    forwardRef(() => ReservationModule),
    PrismaModule,
  ],
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService],
})
export class LineModule {}
