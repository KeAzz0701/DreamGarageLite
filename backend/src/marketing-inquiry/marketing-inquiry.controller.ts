// backend/src/marketing-inquiry/marketing-inquiry.controller.ts

import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { LoginRateLimitGuard } from '../common/login-rate-limit.guard';
import { MarketingInquiryService } from './marketing-inquiry.service';

@Public()
@Controller('marketing-inquiries')
export class MarketingInquiryController {
  constructor(private readonly marketingInquiryService: MarketingInquiryService) {}

  @UseGuards(LoginRateLimitGuard)
  @Post()
  async create(
    @Body() body: { company?: string; name?: string; email?: string; phone?: string; message?: string },
  ) {
    const { company, name, email, phone, message } = body ?? {};

    if (!company?.trim() || !name?.trim() || !email?.trim() || !message?.trim()) {
      throw new BadRequestException('必須項目が入力されていません。');
    }

    return this.marketingInquiryService.create({
      company: company.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      message: message.trim(),
    });
  }
}
