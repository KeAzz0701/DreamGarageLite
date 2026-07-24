// backend/src/common/login-rate-limit.guard.ts

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * ログイン試行のブルートフォース対策。IPアドレス×パス単位で、1分間に5回まで
 * に制限する。プロセス内メモリで保持するだけの簡易実装(専用ライブラリを
 * 追加インストールできない環境のため自前実装)。
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const key = `${request.path}:${ip}`;
    const now = Date.now();

    const entry = this.attempts.get(key);

    if (!entry || entry.resetAt < now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (entry.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        '試行回数が多すぎます。しばらくしてから再度お試しください。',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;

    return true;
  }
}
