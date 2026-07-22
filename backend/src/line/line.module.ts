// backend/src/line/line.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { CustomerModule } from '../customer/customer.module';
import { ReservationModule } from '../reservation/reservation.module';

@Module({
  imports: [CustomerModule, forwardRef(() => ReservationModule)],
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService],
})
export class LineModule {}
