// backend/src/license/license.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Plan, PaymentMethod } from '@prisma/client';
import { LicenseService } from './license.service';

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

  @Patch('company/:companyId/plans')
  async changePlan(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: { plan: Plan },
  ) {
    return this.licenseService.changePlan(companyId, body.plan);
  }

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

  @Post('plan-change-requests/:id/approve')
  async approvePlanChangeRequest(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.licenseService.approvePlanChangeRequest(id);
  }

  @Post('plan-change-requests/:id/reject')
  async rejectPlanChangeRequest(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.licenseService.rejectPlanChangeRequest(id);
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