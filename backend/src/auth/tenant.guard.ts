// backend/src/auth/tenant.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant/tenant-context.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * @Public()が付いていないルートは、TenantMiddlewareが確立したテナントコンテキストが
 * 存在することを必須にする(=ログイン必須)。クライアントの自己申告は一切信用しない。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    if (!this.tenantContext.current()) {
      throw new UnauthorizedException('ログインが必要です。');
    }

    return true;
  }
}
