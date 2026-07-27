// backend/src/portal/portal-auth.controller.ts

import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { PortalService } from './portal.service';
import { PortalSessionService, PORTAL_SESSION_COOKIE, PortalSessionPayload } from './portal-session.service';
import { PortalAuthGuard } from './portal-auth.guard';
import { MasterPrismaService } from '../prisma/master-prisma.service';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  maxAge: 180 * 24 * 60 * 60 * 1000,
  path: '/',
};

type PortalRequest = Request & { portalSession?: PortalSessionPayload };

@Public()
@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private readonly portalService: PortalService,
    private readonly portalSessionService: PortalSessionService,
    private readonly masterPrisma: MasterPrismaService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.portalService.verifyAndResolveLogin(body?.idToken ?? '');

    if (!result.linked) {
      return { linked: false };
    }

    res.cookie(
      PORTAL_SESSION_COOKIE,
      this.portalSessionService.sign({
        lineUserId: result.lineUserId,
        companyAccountId: result.activeCompanyId,
        tenantCustomerId: result.activeTenantCustomerId,
      }),
      COOKIE_OPTIONS,
    );

    return {
      linked: true,
      activeCompanyId: result.activeCompanyId,
      companies: result.companies,
    };
  }

  @UseGuards(PortalAuthGuard)
  @Get('companies')
  async companies(@Req() req: PortalRequest) {
    const links = await this.masterPrisma.lineCompanyLink.findMany({
      where: { lineUserId: req.portalSession!.lineUserId },
      include: { companyAccount: true },
      orderBy: { lastActiveAt: 'desc' },
    });

    return links.map((l) => ({
      companyAccountId: l.companyAccountId,
      displayName: l.companyAccount.displayName,
    }));
  }

  @UseGuards(PortalAuthGuard)
  @Get('companies-status')
  async companiesStatus(@Req() req: PortalRequest) {
    return this.portalService.listCompanyStatuses(req.portalSession!.lineUserId);
  }

  @UseGuards(PortalAuthGuard)
  @Post('switch-company')
  async switchCompany(
    @Body() body: { companyAccountId: number },
    @Req() req: PortalRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tenantCustomerId } = await this.portalService.switchCompany(
      req.portalSession!.lineUserId,
      body?.companyAccountId,
    );

    res.cookie(
      PORTAL_SESSION_COOKIE,
      this.portalSessionService.sign({
        lineUserId: req.portalSession!.lineUserId,
        companyAccountId: body.companyAccountId,
        tenantCustomerId,
      }),
      COOKIE_OPTIONS,
    );

    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(PORTAL_SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }
}
