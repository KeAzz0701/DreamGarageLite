// backend/src/auth/session.service.ts

import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'gk_session';

export interface SessionPayload {
  companyAccountId: number;
  // 従業員のLINE入室(入室ID/LIFFワンタップ)でログインした場合のみ入る。
  // 会社パスワードでのログイン(社長)には付かない
  staffLinkId?: number;
  staffDisplayName?: string | null;
}

@Injectable()
export class SessionService {
  private get secret(): string {
    const secret = process.env.SESSION_JWT_SECRET;

    if (!secret) {
      throw new Error('SESSION_JWT_SECRET is not set');
    }

    return secret;
  }

  sign(payload: SessionPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '30d' });
  }

  verify(token: string): SessionPayload | null {
    try {
      return jwt.verify(token, this.secret) as SessionPayload;
    } catch {
      return null;
    }
  }
}
