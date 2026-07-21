// backend/src/common/plans.ts

import { Plan } from '@prisma/client';

export interface PlanLimits {
  label: string;
  priceYen: number;
  maxOcrPerMonth: number;
  maxCustomers: number | null; // null = 無制限
  maxUsers: number;
  predictiveMaintenance: boolean;
  aiChat: boolean;
  webReservation: boolean;
  multiLocation: boolean;
}

/** 無料版・初月お試し期間(全機能+OCR30件) */
const FREE_TRIAL_LIMITS: PlanLimits = {
  label: '無料版(初月お試し)',
  priceYen: 0,
  maxOcrPerMonth: 30,
  maxCustomers: 30,
  maxUsers: 1,
  predictiveMaintenance: true,
  aiChat: true,
  webReservation: true,
  multiLocation: false,
};

/** 無料版・2ヶ月目以降(車検満了通知のみ、OCR5件) */
const FREE_STANDARD_LIMITS: PlanLimits = {
  label: '無料版',
  priceYen: 0,
  maxOcrPerMonth: 5,
  maxCustomers: 30,
  maxUsers: 1,
  predictiveMaintenance: false,
  aiChat: false,
  webReservation: false,
  multiLocation: false,
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: FREE_STANDARD_LIMITS,
  LITE: {
    label: 'ライト',
    priceYen: 500,
    maxOcrPerMonth: 15,
    maxCustomers: null,
    maxUsers: 1,
    predictiveMaintenance: true,
    aiChat: false,
    webReservation: false,
    multiLocation: false,
  },
  STANDARD: {
    label: '中小規模工場版',
    priceYen: 5980,
    maxOcrPerMonth: 50,
    maxCustomers: null,
    maxUsers: 3,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: true,
    multiLocation: false,
  },
  PRO: {
    label: '中小規模工場版 Pro',
    priceYen: 5980,
    maxOcrPerMonth: 50,
    maxCustomers: null,
    maxUsers: 3,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: true,
    multiLocation: false,
  },
  ENTERPRISE: {
    label: '大規模工場版',
    priceYen: 19800,
    maxOcrPerMonth: 150,
    maxCustomers: null,
    maxUsers: 10,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: true,
    multiLocation: true,
  },
  DEMO: {
    label: 'デモプレイ版',
    priceYen: 0,
    maxOcrPerMonth: 150,
    maxCustomers: null,
    maxUsers: 10,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: true,
    multiLocation: true,
  },
};

/** デモプレイ版は先着でこの人数分までしか割り当てられない */
export const DEMO_PLAN_CAPACITY = 10;

function isWithinFirstMonth(activatedAt: Date): boolean {
  const trialEnd = new Date(activatedAt);
  trialEnd.setMonth(trialEnd.getMonth() + 1);
  return new Date() < trialEnd;
}

/** FREEプランは初月お試し(全機能)か2ヶ月目以降かで上限が変わるため、activatedAtを見て実際の上限を返す */
export function getEffectivePlanLimits(
  plan: Plan,
  activatedAt: Date | null,
): PlanLimits {
  if (plan === 'FREE') {
    if (activatedAt && isWithinFirstMonth(activatedAt)) {
      return FREE_TRIAL_LIMITS;
    }
    return FREE_STANDARD_LIMITS;
  }

  return PLAN_LIMITS[plan];
}
