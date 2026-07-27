// backend/src/auth/owner-only.guard.ts

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { SessionPayload } from './session.service';

/**
 * 従業員のLINE入室セッション(staffSessionあり)からは呼べないようにするガード。
 * 会社パスワードでログインした経営者セッションのみ許可する
 */
@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { staffSession?: SessionPayload }>();

    if (request.staffSession) {
      throw new ForbiddenException('この操作は経営者アカウントでのみ行えます。');
    }

    return true;
  }
}
