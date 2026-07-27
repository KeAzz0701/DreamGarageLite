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
  lineHistoryView: boolean;
  reservationNotifications: boolean;
  /**
   * 顧客ポータル(整備履歴・次回整備おすすめ等)を顧客に開放するかどうか。
   * 顧客個人への課金はせず、店舗のプランに含める形にしている
   * (連携している店舗のうちどれか1つでもこのプラン以上なら、その顧客はポータルを使える)。
   */
  portalAccess: boolean;
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
  lineHistoryView: true,
  reservationNotifications: true,
  portalAccess: true,
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
  lineHistoryView: false,
  reservationNotifications: false,
  portalAccess: false,
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: FREE_STANDARD_LIMITS,
  LITE: {
    label: 'LITE',
    priceYen: 980,
    maxOcrPerMonth: 15,
    maxCustomers: null,
    maxUsers: 1,
    predictiveMaintenance: true,
    aiChat: false,
    webReservation: false,
    multiLocation: false,
    lineHistoryView: false,
    reservationNotifications: true,
    portalAccess: false,
  },
  STANDARD: {
    label: 'STANDARD',
    priceYen: 2980,
    maxOcrPerMonth: 30,
    maxCustomers: null,
    maxUsers: 2,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: false,
    multiLocation: false,
    lineHistoryView: true,
    reservationNotifications: true,
    portalAccess: true,
  },
  PRO: {
    label: 'PRO',
    priceYen: 5980,
    maxOcrPerMonth: 60,
    maxCustomers: null,
    maxUsers: 3,
    predictiveMaintenance: true,
    aiChat: true,
    webReservation: true,
    multiLocation: false,
    lineHistoryView: true,
    reservationNotifications: true,
    portalAccess: true,
  },
  // 通常の申し込み画面(PLAN_ORDER)には出さない特別枠。大規模チェーン等から個別相談があった場合、
  // 運営管理画面から直接このプランに設定する想定
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
    lineHistoryView: true,
    reservationNotifications: true,
    portalAccess: true,
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
    lineHistoryView: true,
    reservationNotifications: true,
    portalAccess: true,
  },
};

/** デモプレイ版は先着でこの人数分までしか割り当てられない */
export const DEMO_PLAN_CAPACITY = 10;

function isWithinFirstMonth(activatedAt: Date): boolean {
  const trialEnd = new Date(activatedAt);
  trialEnd.setMonth(trialEnd.getMonth() + 1);
  return new Date() < trialEnd;
}

/**
 * FREEプランは初月お試し(全機能)か2ヶ月目以降かで上限が変わるため、activatedAtを見て実際の上限を返す。
 * ただし過去に一度でも有料プランを使ったことがある場合は、FREEに戻っても初月お試し特典は与えない
 * (お試し→有料→解約→お試しを繰り返す抜け道を防ぐため)。
 */
export function getEffectivePlanLimits(
  plan: Plan,
  activatedAt: Date | null,
  hasUsedPaidPlan = false,
): PlanLimits {
  if (plan === 'FREE') {
    if (!hasUsedPaidPlan && activatedAt && isWithinFirstMonth(activatedAt)) {
      return FREE_TRIAL_LIMITS;
    }
    return FREE_STANDARD_LIMITS;
  }

  return PLAN_LIMITS[plan];
}

/**
 * FREEプランの初月お試し中(全機能利用可)なら残り日数を返す。お試し対象外(2ヶ月目以降・
 * 有料経験あり・FREE以外のプラン)ならnullを返す。設定画面の「まもなく使えなくなります」表示に使う。
 */
export function getTrialDaysRemaining(
  plan: Plan,
  activatedAt: Date | null,
  hasUsedPaidPlan = false,
): number | null {
  if (plan !== 'FREE' || hasUsedPaidPlan || !activatedAt) return null;

  const trialEnd = new Date(activatedAt);
  trialEnd.setMonth(trialEnd.getMonth() + 1);

  const msRemaining = trialEnd.getTime() - Date.now();

  if (msRemaining <= 0) return null;

  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
}
