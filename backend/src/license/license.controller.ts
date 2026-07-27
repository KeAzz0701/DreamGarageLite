// backend/src/license/license.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Plan, PaymentMethod } from '@prisma/client';
import { LicenseService } from './license.service';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';

// このエンドポイントから会社(利用者)が直接切り替えられるのは、支払いが不要な
// プランのみ。有料プランは必ず支払い後、運営管理画面での承認(AdminController)を
// 経由する必要がある
const SELF_SERVICE_PLANS: Plan[] = ['FREE', 'DEMO'];

@Controller('license')
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
  ) {}

  @Get()
  async getLicense() {
    return this.licenseService.getLicense();
  }

  @Get('company/:companyId/plans')
  async getPlanInfo(
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.licenseService.getPlanInfo(companyId);
  }

  @UseGuards(OwnerOnlyGuard)
  @Patch('company/:companyId/plans')
  async changePlan(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: { plan: Plan },
  ) {
    if (!SELF_SERVICE_PLANS.includes(body.plan)) {
      throw new ForbiddenException(
        '有料プランへの変更は、支払い後の運営側承認が必要です。',
      );
    }

    return this.licenseService.changePlan(companyId, body.plan);
  }

  @UseGuards(OwnerOnlyGuard)
  @Post('company/:companyId/plan-change-requests')
  async requestPlanChange(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: { targetPlan: Plan; paymentMethod: PaymentMethod },
  ) {
    return this.licenseService.requestPlanChange(
      companyId,
      body.targetPlan,
      body.paymentMethod,
    );
  }

  @Get('company/:companyId/plan-change-requests')
  async listPlanChangeRequests(
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.licenseService.listPlanChangeRequests(companyId);
  }

  @Get(':key')
  async getByKey(
    @Param('key') key: string,
  ) {
    return this.licenseService.getByKey(key);
  }

  @Post('activate')
  async activate(
    @Body() body: { licenseKey: string },
  ) {
    return this.licenseService.activate(
      body.licenseKey,
    );
  }

  @Post('api-keys')
  async addApiKey(
    @Body() body: { apiKey: string; tier?: 'FREE' | 'PAID' },
  ) {
    return this.licenseService.addApiKeyToPool(
      body.apiKey,
      body.tier,
    );
  }

  @Get('ocr/:companyId')
  async canUseOcr(
    @Param('companyId') companyId: string,
  ) {
    return {
      available: await this.licenseService.canUseOcr(
        Number(companyId),
      ),
    };
  }

  @Patch('ocr/:companyId')
  async incrementOcr(
    @Param('companyId') companyId: string,
  ) {
    return this.licenseService.incrementOcr(
      Number(companyId),
    );
  }
}