// backend/src/google-calendar/google-calendar.controller.ts

import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GoogleCalendarService } from './google-calendar.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SessionService, SESSION_COOKIE } from '../auth/session.service';
import { Public } from '../auth/public.decorator';

@Controller('google-calendar')
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('status')
  async status() {
    return this.googleCalendarService.getStatus();
  }

  @Get('oauth/start')
  async oauthStart(@Res() res: Response) {
    if (!this.googleCalendarService.isConfigured()) {
      throw new BadRequestException(
        'Googleカレンダー連携が設定されていません。管理者にお問い合わせください。',
      );
    }

    res.redirect(this.googleCalendarService.getAuthUrl());
  }

  /**
   * Googleからのリダイレクトで戻ってくるルート。通常のセッションCookieに依存せず、
   * ここで明示的にセッションを検証してテナントを解決する。
   */
  @Public()
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

    const token = req.cookies?.[SESSION_COOKIE];
    const payload = token ? this.sessionService.verify(token) : null;

    if (!code || !payload) {
      res.redirect(`${appUrl}/settings?googleCalendar=error`);
      return;
    }

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: payload.companyAccountId },
    });

    if (!company || !company.isActive) {
      res.redirect(`${appUrl}/settings?googleCalendar=error`);
      return;
    }

    try {
      await this.tenantContext.run(company, () =>
        this.googleCalendarService.handleOAuthCallback(code),
      );
      res.redirect(`${appUrl}/settings?googleCalendar=connected`);
    } catch (err) {
      this.logger.error('Googleカレンダー連携のコールバック処理に失敗しました', err);
      res.redirect(`${appUrl}/settings?googleCalendar=error`);
    }
  }

  @Post('disconnect')
  async disconnect() {
    await this.googleCalendarService.disconnect();
    return { ok: true };
  }
}
