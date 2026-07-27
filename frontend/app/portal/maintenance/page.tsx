// frontend/app/portal/maintenance/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

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
type Recommendations = {
  shaken: ShakenCandidate[];
  oil: MaintenanceCandidate[];
  tire: MaintenanceCandidate[];
};

export default function PortalMaintenancePage() {
  const [data, setData] = useState<Recommendations | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Recommendations>('/portal/maintenance-recommendations')
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e) || '読み込みに失敗しました'));
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="disp text-2xl">次回整備のおすすめ</h1>
        <Link href="/portal" className="btn btn-ghost btn-sm">戻る</Link>
      </div>

      {error && <div className="panel"><div className="empty">{error}</div></div>}

      {!error && !data && (
        <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>
      )}

      {data && data.shaken.length === 0 && data.oil.length === 0 && data.tire.length === 0 && (
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
              <div className="text-sm">車検満了: {c.expirationDate}</div>
            </div>
          ))}
        </div>
      )}

      {data && data.oil.length > 0 && (
        <div className="panel mb-4">
          <h2 className="disp text-lg mb-3">🛢 オイル交換</h2>
          {data.oil.map((c) => (
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
      )}

      {data && data.tire.length > 0 && (
        <div className="panel">
          <h2 className="disp text-lg mb-3">🛞 タイヤ交換</h2>
          {data.tire.map((c) => (
            <div key={c.vehicleId} className="veh mb-2">
              <div className="font-semibold">{c.vehicleLabel}</div>
              <div className="text-sm">{c.dueLabel}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
