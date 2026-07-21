// backend/src/license/license.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly licenseService: LicenseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest();

    const companyId = Number(
      request.headers['x-company-id'],
    );

    if (!companyId) {
      throw new ForbiddenException(
        '会社IDが必要です。',
      );
    }

    const company =
      await this.licenseService.canUseOcr(
        companyId,
      );

    if (!company) {
      throw new ForbiddenException(
        '今月のOCR利用上限に達しています。プランのアップグレードが必要です。',
      );
    }

    request.companyId = companyId;

    return true;
  }
}