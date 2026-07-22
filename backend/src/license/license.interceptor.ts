// backend/src/license/license.interceptor.ts

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseInterceptor implements NestInterceptor {
  constructor(
    private readonly licenseService: LicenseService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest();

    // LicenseGuardが先に実行され、テナントDB内の会社から取得したcompanyIdを
    // request.companyIdへ設定済みのため、それを使う(クライアントの自己申告は信用しない)
    const companyId = request.companyId;

    if (!companyId) {
      throw new ForbiddenException(
        '会社IDが見つかりません。',
      );
    }

    const canUse =
      await this.licenseService.canUseOcr(
        companyId,
      );

    if (!canUse) {
      throw new ForbiddenException(
        '今月のOCR利用上限を超えています。',
      );
    }

    return next.handle().pipe(
      tap(async () => {
        await this.licenseService.incrementOcr(
          companyId,
        );
      }),
    );
  }
}