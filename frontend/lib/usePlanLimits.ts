// frontend/lib/usePlanLimits.ts

import { useEffect, useState } from 'react';
import { api } from './api';

export type PlanLimits = {
  label: string;
  priceYen: number;
  maxOcrPerMonth: number;
  maxCustomers: number | null;
  maxUsers: number;
  predictiveMaintenance: boolean;
  aiChat: boolean;
  webReservation: boolean;
  multiLocation: boolean;
  lineHistoryView: boolean;
};

/** 現在ログイン中の会社の実効プラン制限を取得する。取得できるまではnull(呼び出し側は許可扱いで良い)。 */
export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<any>('/company')
      .then((company) => {
        if (!company) return;
        return api<any>(`/license/company/${company.id}/plans`).then((planInfo) => {
          setLimits(planInfo?.current?.limits ?? null);
          setPlan(planInfo?.current?.plan ?? null);
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { limits, plan, loaded };
}
