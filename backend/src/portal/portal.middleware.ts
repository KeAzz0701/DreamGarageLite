// backend/src/portal/portal.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PortalSessionService, PORTAL_SESSION_COOKIE } from './portal-session.service';

/**
 * 顧客ポータルのセッションCookieがあれば会社を解決し、リクエストをテナントコンテキストで
 * 包んでから次へ進む(TenantMiddlewareの顧客ポータル版)。Cookieが無い/無効な場合は
 * 何もせずそのまま次へ進む(ログイン前のPOST /portal/auth/loginのため)。
 */
@Injectable()
export class PortalMiddleware implements NestMiddleware {
  constructor(
    private readonly portalSessionService: PortalSessionService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[PORTAL_SESSION_COOKIE];
    const payload = token ? this.portalSessionService.verify(token) : null;

    if (!payload) {
      next();
      return;
    }

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: payload.companyAccountId },
    });

    if (!company || !company.isActive) {
      next();
      return;
    }

    (req as Request & { portalSession?: typeof payload }).portalSession = payload;

    this.tenantContext.run(company, () => next());
  }
}
