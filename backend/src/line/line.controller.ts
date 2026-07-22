// backend/src/line/line.controller.ts

import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LineService } from './line.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { Public } from '../auth/public.decorator';

@Controller('line')
export class LineController {
  constructor(
    private readonly lineService: LineService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody: Buffer },
    @Headers('x-line-signature') signature: string,
  ) {
    const destination = req.body?.destination;

    if (!destination) {
      throw new BadRequestException('Missing destination');
    }

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { lineDestinationUserId: destination },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Unknown LINE channel');
    }

    return this.tenantContext.run(company, async () => {
      if (!this.lineService.verifySignature(req.rawBody, signature)) {
        throw new BadRequestException('Invalid signature');
      }

      const events = req.body?.events ?? [];

      // LINEは数秒以内の200応答を要求するため、処理は待たずに返す
      void this.lineService.handleEvents(events);

      return { status: 'ok' };
    });
  }
}
