// backend/src/admin/admin-session.service.ts

import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export const ADMIN_SESSION_COOKIE = 'gk_admin_session';

@Injectable()
export class AdminSessionService {
  private get secret(): string {
    const secret = process.env.SESSION_JWT_SECRET;

    if (!secret) {
      throw new Error('SESSION_JWT_SECRET is not set');
    }

    return secret;
  }

  sign(adminUser?: { id: number; username: string }): string {
    return jwt.sign(
      { admin: true, adminUserId: adminUser?.id, username: adminUser?.username },
      this.secret,
      { expiresIn: '7d' },
    );
  }

  verify(token: string): { adminUserId?: number; username?: string } | null {
    try {
      const payload = jwt.verify(token, this.secret) as {
        admin?: boolean;
        adminUserId?: number;
        username?: string;
      };

      if (payload.admin !== true) return null;

      return { adminUserId: payload.adminUserId, username: payload.username };
    } catch {
      return null;
    }
  }
}
