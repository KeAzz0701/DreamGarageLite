// backend/src/portal/portal-session.service.ts

import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export const PORTAL_SESSION_COOKIE = 'gk_portal_session';

export interface PortalSessionPayload {
  lineUserId: string;
  companyAccountId: number;
  tenantCustomerId: number;
}

@Injectable()
export class PortalSessionService {
  private get secret(): string {
    const secret = process.env.SESSION_JWT_SECRET;

    if (!secret) {
      throw new Error('SESSION_JWT_SECRET is not set');
    }

    return secret;
  }

  sign(payload: PortalSessionPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '180d' });
  }

  verify(token: string): PortalSessionPayload | null {
    try {
      const payload = jwt.verify(token, this.secret) as Partial<PortalSessionPayload>;

      if (
        typeof payload.lineUserId !== 'string' ||
        typeof payload.companyAccountId !== 'number' ||
        typeof payload.tenantCustomerId !== 'number'
      ) {
        return null;
      }

      return {
        lineUserId: payload.lineUserId,
        companyAccountId: payload.companyAccountId,
        tenantCustomerId: payload.tenantCustomerId,
      };
    } catch {
      return null;
    }
  }
}
