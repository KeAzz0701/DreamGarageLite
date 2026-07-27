// frontend/app/vehicle/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { parseFlexibleDate } from '@/lib/japaneseDate';
import { normalizeForSearch } from '@/lib/kana';

type Vehicle = {
  id: number;
  registrationNumber: string;
  vin: string;
  carName: string;
  commonModelName: string;
  model: string;
  expirationDate: string;
  createdAt: string;
  customer: {
    customerName: string;
  };
};

const SORT_MODES = [
  { key: 'expiry', label: '車検満了が近い順' },
  { key: 'newest', label: '登録が新しい順' },
  { key: 'name', label: '車名順' },
] as const;

type SortMode = (typeof SORT_MODES)[number]['key'];

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [keyword, setKeyword] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const json = await api<Vehicle[]>('/vehicle');
    setVehicles(json);
  }

  function cycleSortMode() {
    const index = SORT_MODES.findIndex((m) => m.key === sortMode);
    setSortMode(SORT_MODES[(index + 1) % SORT_MODES.length].key);
  }

  const filtered = vehicles.filter((v) => {
    const text = normalizeForSearch(`
${v.registrationNumber}
${v.vin}
${v.carName}
${v.commonModelName}
${v.model}
${v.customer?.customerName}
`);

    return text.includes(normalizeForSearch(keyword));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'newest') {
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    }

    if (sortMode === 'name') {
      return (a.commonModelName || a.carName || '').localeCompare(
        b.commonModelName || b.carName || '',
        'ja',
      );
    }

    const dateA = parseFlexibleDate(a.expirationDate);
    const dateB = parseFlexibleDate(b.expirationDate);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA.getTime() - dateB.getTime();
  });

  const sortLabel =
    SORT_MODES.find((m) => m.key === sortMode)?.label ?? '';

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車両管理</h1>

        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        <input
          className="input flex-1"
          placeholder="登録番号・車台番号・車名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button onClick={cycleSortMode} className="sortbtn">
          ⇅ {sortLabel}
        </button>
      </div>

      <div>
        {sorted.map((vehicle) => (
          <Link
            key={vehicle.id}
            href={`/vehicle/${vehicle.id}`}
            className="card block"
          >
            <div className="card-body">
              <div className="vehtop">
                <div className="plate">
                  <span className="lbl">登録番号</span>
                  <span className="num disp">
                    {vehicle.registrationNumber || '未登録'}
                  </span>
                </div>

                <div className="vinfo">
                  <div className="vname">
                    {vehicle.carName}
                    {vehicle.commonModelName && (
                      <span className="text-[var(--blue)]"> {vehicle.commonModelName}</span>
                    )}
                    {' '}
                    {vehicle.model}
                  </div>
                  <div className="vvin mono text-xs text-[var(--muted)]">
                    VIN: {vehicle.vin}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-[var(--muted)]">顧客</div>
                  <div className="text-sm font-semibold">
                    {vehicle.customer?.customerName}
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    車検満了
                    <div className="mono font-bold text-[var(--ink)]">
                      {vehicle.expirationDate || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}