// backend/src/customer/customer.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LineModule), LicenseModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}