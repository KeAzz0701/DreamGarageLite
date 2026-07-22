// backend/src/license/license.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest();

    // クライアント自己申告のcompanyIdは信用せず、テナントDB内の会社から取得する
    const company = await this.prisma.company.findFirst();

    if (!company) {
      throw new ForbiddenException(
        '会社情報が見つかりません。',
      );
    }

    const canUse =
      await this.licenseService.canUseOcr(
        company.id,
      );

    if (!canUse) {
      throw new ForbiddenException(
        '今月のOCR利用上限に達しています。プランのアップグレードが必要です。',
      );
    }

    request.companyId = company.id;

    return true;
  }
}
