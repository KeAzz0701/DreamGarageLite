// frontend/app/competitor-estimates/page.tsx
//
// 各車両の「他店舗見積」ページ(vehicle/[id])でスタッフ・顧客が登録した他店舗見積を、
// 車種区分×項目カテゴリごとに件数・平均・最小・最大へ集計して見せる比較表。

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

type ComparisonEntry = {
  name: string;
  cost: number;
  shopName: string | null;
  estimateDate: string | null;
};

type ComparisonRow = {
  vehicleCategory: 'KEI' | 'REGULAR' | 'LARGE' | 'CARGO';
  vehicleCategoryLabel: string;
  itemCategory: string;
  count: number;
  avgCost: number;
  minCost: number;
  maxCost: number;
  entries: ComparisonEntry[];
};

const VEHICLE_CATEGORY_ORDER: ComparisonRow['vehicleCategory'][] = [
  'KEI',
  'REGULAR',
  'LARGE',
  'CARGO',
];

export default function CompetitorEstimatesComparisonPage() {
  const [rows, setRows] = useState<ComparisonRow[] | null>(null);
  const [error, setError] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const json = await api<ComparisonRow[]>('/competitor-estimates/comparison-table');
      setRows(json);
    } catch (e: any) {
      setError(extractErrorMessage(e) || '読み込みに失敗しました');
    }
  }

  const grouped = VEHICLE_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    rows: (rows ?? []).filter((r) => r.vehicleCategory === cat),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="competitor-estimates-shell">
      <h1 className="disp text-xl mb-1">他店比較</h1>
      <p className="note mb-4">
        車両ページで登録した「他店舗見積(比較用)」を、車種区分×項目カテゴリごとに集計した相場一覧です。
        顧客・スタッフが「店舗に共有する」を選んで登録した分だけが対象です。
      </p>

      {error && (
        <div className="panel mb-4">
          <div className="empty">{error}</div>
        </div>
      )}

      {rows && grouped.length === 0 && !error && (
        <div className="panel">
          <div className="empty">
            まだ比較できる他店舗見積がありません。車両ページから「他店舗見積」を登録してください。
          </div>
        </div>
      )}

      <div className="grid2">
      {grouped.map((g) => (
        <div key={g.category} className="panel mb-4">
          <h2 className="disp text-lg mb-3">
            {g.rows[0].vehicleCategoryLabel}
          </h2>

          <div className="space-y-2">
            {g.rows.map((r) => {
              const key = `${r.vehicleCategory}|${r.itemCategory}`;
              const isOpen = openKey === key;

              return (
                <div key={key} className="border-b border-[var(--line)] pb-2">
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div>
                      <span className="font-semibold">{r.itemCategory}</span>
                      <span className="ml-2 text-xs text-[var(--muted)]">{r.count}件</span>
                    </div>
                    <div className="flex items-center gap-4 mono text-sm">
                      <span className="text-[var(--muted)]">
                        ¥{r.minCost.toLocaleString()} 〜 ¥{r.maxCost.toLocaleString()}
                      </span>
                      <span className="text-[var(--blue)] font-bold">
                        平均 ¥{r.avgCost.toLocaleString()}
                      </span>
                      <span className="text-[var(--muted)]">{isOpen ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-2 space-y-1">
                      {r.entries.map((e, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-[var(--paper-dim)] rounded px-2 py-1.5"
                        >
                          <span>
                            {e.name}
                            {e.shopName && (
                              <span className="ml-2 text-[var(--muted)]">{e.shopName}</span>
                            )}
                            {e.estimateDate && (
                              <span className="ml-2 text-[var(--muted)]">{e.estimateDate}</span>
                            )}
                          </span>
                          <span className="mono font-semibold">¥{e.cost.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
