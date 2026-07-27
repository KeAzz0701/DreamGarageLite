// backend/src/portal/portal-auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class PortalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.portalSession) {
      throw new UnauthorizedException('LINEでの認証が必要です。');
    }

    return true;
  }
}
