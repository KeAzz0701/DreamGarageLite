// frontend/app/portal/service-history/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';
import PortalHeader from '@/components/portal/PortalHeader';

type ServiceHistoryItem = { name: string; cost: number };
type ServiceHistoryEntry = {
  id: number;
  date: string;
  title: string;
  mileage: number | null;
  items: ServiceHistoryItem[];
  total: number;
  companyAccountId: number;
  companyName: string;
  vehicleId: number;
  carName: string | null;
  commonModelName: string | null;
};
type CompanyOption = { companyAccountId: number; displayName: string };
type ServiceHistoryResponse = { companies: CompanyOption[]; entries: ServiceHistoryEntry[] };

export default function PortalServiceHistoryPage() {
  const [data, setData] = useState<ServiceHistoryResponse | null>(null);
  const [error, setError] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | null>(null);

  useEffect(() => {
    load(companyFilter);
  }, [companyFilter]);

  function load(filter: number | null) {
    setError('');

    const query = filter ? `?companyAccountId=${filter}` : '';

    api<ServiceHistoryResponse>(`/portal/service-history${query}`)
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e) || '読み込みに失敗しました'));
  }

  return (
    <>
      <PortalHeader title="整備履歴" />
      <div className="portal-body">

      {data && data.companies.length > 1 && (
        <div className="portal-history-filter">
          <button
            onClick={() => setCompanyFilter(null)}
            className={`portal-filter-chip ${companyFilter === null ? 'active' : ''}`}
          >
            すべて
          </button>
          {data.companies.map((c) => (
            <button
              key={c.companyAccountId}
              onClick={() => setCompanyFilter(c.companyAccountId)}
              className={`portal-filter-chip ${companyFilter === c.companyAccountId ? 'active' : ''}`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="panel">
          <div className="empty">
            {error.includes('このプランではご利用いただけません')
              ? 'この店舗ではまだご利用いただけません。店舗にお問い合わせいただくか、別の連携店舗に切り替えてご確認ください。'
              : error}
          </div>
        </div>
      )}

      {!error && !data && (
        <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>
      )}

      {data && data.entries.length === 0 && (
        <div className="panel">
          <div className="empty">整備履歴はまだありません。</div>
        </div>
      )}

      {data && data.entries.length > 0 && (
        <div className="panel">
          {data.entries.map((sh) => (
            <div key={`${sh.companyAccountId}-${sh.id}`} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="mono text-xs text-[var(--muted)]">{sh.date.slice(0, 10)}</span>{' '}
                  <span className="font-semibold">{sh.title}</span>
                </div>
                <span className="mono text-[var(--blue)] font-bold">¥{sh.total.toLocaleString()}</span>
              </div>

              <div className="mt-1 text-xs text-[var(--muted)]">
                🏢 {sh.companyName}
                <span className="mx-1">・</span>
                {[sh.carName, sh.commonModelName].filter(Boolean).join(' ') || '車両'}
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
          ))}
        </div>
      )}
      </div>
    </>
  );
}
