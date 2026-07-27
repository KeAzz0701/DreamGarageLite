// backend/src/auth/tenant.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SessionService, SessionPayload, SESSION_COOKIE } from './session.service';

/**
 * セッションCookieがあれば会社を解決し、リクエスト全体をテナントコンテキストで
 * 包んでから次へ進む。Cookieが無い/無効な場合は何もせずそのまま次へ進む
 * (LINE Webhookやicsリンクなど、コントローラ側で自前にテナントを解決するルートのため)。
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly sessionService: SessionService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[SESSION_COOKIE];
    const payload = token ? this.sessionService.verify(token) : null;

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

    // 従業員のLINE入室でログインしたセッションは、都度LineStaffLinkの存在を
    // 再確認する。社長が設定画面から連携を解除した瞬間、以降のリクエストは
    // ここで弾かれ、発行済みの30日有効なJWTがあっても即ログアウト相当になる
    if (payload.staffLinkId) {
      const staffLink = await this.masterPrisma.lineStaffLink.findUnique({
        where: { id: payload.staffLinkId },
      });

      if (!staffLink || staffLink.companyAccountId !== company.id) {
        next();
        return;
      }

      (req as Request & { staffSession?: SessionPayload }).staffSession = payload;
    }

    this.tenantContext.run(company, () => next());
  }
}
