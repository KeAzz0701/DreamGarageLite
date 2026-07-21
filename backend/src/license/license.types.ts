// backend/src/license/license.types.ts

export enum LicensePlan {
  FREE = 'FREE',
  LITE = 'LITE',
  STANDARD = 'STANDARD',
  PRO = 'PRO',
}

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export interface LicenseInfo {
  id: number;

  companyId: number;

  licenseKey: string;

  plan: LicensePlan;

  status: LicenseStatus;

  maxUsers: number;

  maxOcrPerMonth: number;

  usedOcr: number;

  expireAt: Date | null;

  activatedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export const LicenseDefaults = {
  FREE: {
    maxUsers: 1,
    maxOcrPerMonth: 30,
  },

  LITE: {
    maxUsers: 3,
    maxOcrPerMonth: 300,
  },

  STANDARD: {
    maxUsers: 10,
    maxOcrPerMonth: -1,
  },

  PRO: {
    maxUsers: 9999,
    maxOcrPerMonth: -1,
  },
};