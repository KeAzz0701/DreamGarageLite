// frontend/app/portal/service-history/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

type ServiceHistoryItem = { name: string; cost: number };
type ServiceHistory = {
  id: number;
  date: string;
  title: string;
  mileage: number | null;
  items: ServiceHistoryItem[];
  total: number;
};
type VehicleGroup = {
  vehicleId: number;
  carName: string | null;
  commonModelName: string | null;
  serviceHistories: ServiceHistory[];
};

export default function PortalServiceHistoryPage() {
  const [groups, setGroups] = useState<VehicleGroup[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<VehicleGroup[]>('/portal/service-history')
      .then(setGroups)
      .catch((e) => setError(extractErrorMessage(e) || '読み込みに失敗しました'));
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="disp text-2xl">整備履歴</h1>
        <Link href="/portal" className="btn btn-ghost btn-sm">戻る</Link>
      </div>

      {error && <div className="panel"><div className="empty">{error}</div></div>}

      {!error && !groups && (
        <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>
      )}

      {groups?.map((g) => (
        <div key={g.vehicleId} className="panel mb-4">
          <h2 className="disp text-lg mb-3">
            {g.carName || '-'}
            {g.commonModelName && <span className="ml-2 text-[var(--blue)]">{g.commonModelName}</span>}
          </h2>

          {g.serviceHistories.length === 0 ? (
            <div className="empty">整備履歴はまだありません。</div>
          ) : (
            g.serviceHistories.map((sh) => (
              <div key={sh.id} className="veh mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="mono text-xs text-[var(--muted)]">{sh.date.slice(0, 10)}</span>{' '}
                    <span className="font-semibold">{sh.title}</span>
                  </div>
                  <span className="mono text-[var(--blue)] font-bold">¥{sh.total.toLocaleString()}</span>
                </div>
                {sh.items.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    {sh.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.name}</span>
                        <span className="mono">¥{it.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </>
  );
}
