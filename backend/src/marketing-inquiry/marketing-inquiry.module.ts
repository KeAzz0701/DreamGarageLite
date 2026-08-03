// backend/src/marketing-inquiry/marketing-inquiry.module.ts

import { Module } from '@nestjs/common';
import { LineModule } from '../line/line.module';
import { SystemAdminLineModule } from '../system-admin-line/system-admin-line.module';
import { MarketingInquiryController } from './marketing-inquiry.controller';
import { MarketingInquiryService } from './marketing-inquiry.service';

@Module({
  imports: [LineModule, SystemAdminLineModule],
  controllers: [MarketingInquiryController],
  providers: [MarketingInquiryService],
})
export class MarketingInquiryModule {}
