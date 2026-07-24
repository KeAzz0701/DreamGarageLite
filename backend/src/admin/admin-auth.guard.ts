// backend/src/admin/admin-auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminSessionService, ADMIN_SESSION_COOKIE } from './admin-session.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminSessionService: AdminSessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[ADMIN_SESSION_COOKIE];
    const payload = token ? this.adminSessionService.verify(token) : null;

    if (!payload) {
      throw new UnauthorizedException('管理者ログインが必要です。');
    }

    request.admin = payload;

    return true;
  }
}
