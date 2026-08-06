// frontend/app/portal/maintenance/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';
import PortalHeader from '@/components/portal/PortalHeader';
import { formatFlexibleDate } from '@/lib/japaneseDate';

type ShakenCandidate = {
  vehicleId: number;
  vehicleLabel: string;
  registrationNumber: string | null;
  expirationDate: string;
};
type MaintenanceCandidate = {
  vehicleId: number;
  vehicleLabel: string;
  registrationNumber: string | null;
  dueLabel: string;
  recommendElement?: boolean;
};
type MaintenanceGroup = {
  typeName: string;
  candidates: MaintenanceCandidate[];
};
type Recommendations = {
  shaken: ShakenCandidate[];
  maintenance: MaintenanceGroup[];
};

const TYPE_ICON: Record<string, string> = {
  'オイル交換': '🛢',
  'タイヤ交換': '🛞',
};

export default function PortalMaintenancePage() {
  const [data, setData] = useState<Recommendations | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Recommendations>('/portal/maintenance-recommendations')
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e) || '読み込みに失敗しました'));
  }, []);

  const hasNothing =
    data && data.shaken.length === 0 && data.maintenance.every((g) => g.candidates.length === 0);

  return (
    <>
      <PortalHeader title="次回整備のおすすめ" />
      <div className="portal-body">

      {error && (
        <div className="panel">
          <div className="empty">
            {error.includes('このプランではご利用いただけません')
              ? 'この店舗ではおすすめ表示機能がまだご利用いただけません。店舗にお問い合わせいただくか、別の連携店舗に切り替えてご確認ください。'
              : error}
          </div>
        </div>
      )}

      {!error && !data && (
        <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>
      )}

      {hasNothing && (
        <div className="panel">
          <div className="empty">現在、近日中のおすすめはありません。</div>
        </div>
      )}

      {data && data.shaken.length > 0 && (
        <div className="panel mb-4">
          <h2 className="disp text-lg mb-3">🚗 車検</h2>
          {data.shaken.map((c) => (
            <div key={c.vehicleId} className="veh mb-2">
              <div className="font-semibold">{c.vehicleLabel}</div>
              <div className="text-sm">車検満了: {formatFlexibleDate(c.expirationDate)}</div>
            </div>
          ))}
        </div>
      )}

      {data &&
        data.maintenance.map((group) => (
          <div key={group.typeName} className="panel mb-4">
            <h2 className="disp text-lg mb-3">
              {TYPE_ICON[group.typeName] ?? '🔧'} {group.typeName}
            </h2>
            {group.candidates.map((c) => (
              <div key={c.vehicleId} className="veh mb-2">
                <div className="font-semibold">{c.vehicleLabel}</div>
                <div className="text-sm">{c.dueLabel}</div>
                {c.recommendElement && (
                  <div className="text-xs text-[var(--muted)] mt-1">
                    オイルエレメントの交換もおすすめです。
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
