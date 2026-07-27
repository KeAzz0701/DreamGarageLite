// frontend/app/portal/tire-wear/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';
import PortalHeader from '@/components/portal/PortalHeader';

type TireWearEstimate =
  | { status: 'insufficient_data'; latestDepthMm: number }
  | { status: 'stable'; latestDepthMm: number }
  | {
      status: 'wearing';
      latestDepthMm: number;
      dangerNow: boolean;
      axis: 'mileage' | 'days';
      remainingToRecommended: number;
    };

type TireWearGroupResult = {
  position: string;
  tireType: string;
  estimate: TireWearEstimate;
};

type VehicleTireWear = {
  vehicleId: number;
  carName: string | null;
  commonModelName: string | null;
  estimates: TireWearGroupResult[];
};

const POSITION_LABEL: Record<string, string> = {
  FL: '左前',
  FR: '右前',
  RL: '左後',
  RR: '右後',
  ALL: '4本一括',
};

const TIRE_TYPE_LABEL: Record<string, string> = {
  SUMMER: '夏タイヤ',
  WINTER: '冬タイヤ',
};

function estimateLabel(estimate: TireWearEstimate): string {
  if (estimate.status === 'insufficient_data') {
    return `データ不足(現在 ${estimate.latestDepthMm}mm)`;
  }

  if (estimate.status === 'stable') {
    return `摩耗ほぼなし(現在 ${estimate.latestDepthMm}mm)`;
  }

  if (estimate.dangerNow) {
    return `⚠️ 交換時期です(現在 ${estimate.latestDepthMm}mm)`;
  }

  const unit = estimate.axis === 'mileage' ? 'km' : '日';
  return `推定交換時期まであと約${estimate.remainingToRecommended.toLocaleString()}${unit}(現在 ${estimate.latestDepthMm}mm)`;
}

export default function PortalTireWearPage() {
  const [data, setData] = useState<VehicleTireWear[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<VehicleTireWear[]>('/portal/tire-wear')
      .then(setData)
      .catch((e) => setError(extractErrorMessage(e) || '読み込みに失敗しました'));
  }, []);

  return (
    <>
      <PortalHeader title="タイヤの推定交換時期" />
      <div className="portal-body">

      <div className="panel mb-4" style={{ background: 'var(--warn-bg, #fff8e6)' }}>
        <p className="note">
          ⚠️ この推定は、店舗で測定した溝の深さから機械的に計算した目安です。実際の摩耗状態や走行環境によって前後します。安全に関わる判断は、必ず実車の点検結果を優先してください。
        </p>
      </div>

      {error && (
        <div className="panel">
          <div className="empty">
            {error.includes('このプランではご利用いただけません')
              ? 'この店舗ではタイヤ交換時期の表示機能がまだご利用いただけません。店舗にお問い合わせいただくか、別の連携店舗に切り替えてご確認ください。'
              : error}
          </div>
        </div>
      )}

      {!error && !data && (
        <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>
      )}

      {data?.map((v) => (
        <div key={v.vehicleId} className="panel mb-4">
          <h2 className="disp text-lg mb-3">
            {v.carName || '-'}
            {v.commonModelName && <span className="ml-2 text-[var(--blue)]">{v.commonModelName}</span>}
          </h2>

          {v.estimates.length === 0 ? (
            <div className="empty">タイヤ測定の記録はまだありません。</div>
          ) : (
            v.estimates.map((e) => (
              <div key={`${e.position}-${e.tireType}`} className="veh mb-2">
                <div className="font-semibold">
                  {POSITION_LABEL[e.position] ?? e.position}
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {TIRE_TYPE_LABEL[e.tireType] ?? e.tireType}
                  </span>
                </div>
                <div className="text-sm">{estimateLabel(e.estimate)}</div>
              </div>
            ))
          )}
        </div>
      ))}
      </div>
    </>
  );
}
