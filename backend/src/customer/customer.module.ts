// backend/src/customer/customer.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LineModule)],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}