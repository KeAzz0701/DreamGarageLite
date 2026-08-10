// frontend/app/portal/competitor-estimates/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage, upload } from '@/lib/api';
import PortalHeader from '@/components/portal/PortalHeader';

type Vehicle = { id: number; carName: string | null; commonModelName: string | null };
type Me = { vehicles: Vehicle[] };

type CompetitorEstimateRow = {
  id: number;
  vehicleId: number;
  shopName: string | null;
  estimateDate: string | null;
  items:
    | {
        name: string;
        cost?: number;
        quantity?: number | null;
        unitPrice?: number | null;
        laborCost?: number | null;
        oilGrade?: string | null;
      }[]
    | null;
  totalAmount: number | null;
  createdBy: 'STAFF' | 'CUSTOMER';
  sharedWithShop: boolean;
  createdAt: string;
};

export default function PortalCompetitorEstimatesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [shareWithShop, setShareWithShop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [list, setList] = useState<CompetitorEstimateRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    try {
      const me = await api<Me>('/portal/me');
      setVehicles(me.vehicles);
      if (me.vehicles.length > 0) setVehicleId(String(me.vehicles[0].id));
      await loadList();
    } catch (e: any) {
      setError(extractErrorMessage(e) || '読み込みに失敗しました');
    }
  }

  async function loadList() {
    const json = await api<CompetitorEstimateRow[]>('/portal/competitor-estimate');
    setList(json);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !vehicleId) return;

    setUploading(true);

    try {
      await upload('/portal/competitor-estimate', file, {
        vehicleId,
        sharedWithShop: String(shareWithShop),
      });
      await loadList();
    } catch (err: any) {
      alert(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PortalHeader title="他店舗見積の保存" />
      <div className="portal-body">

      {error && <div className="panel mb-4"><div className="empty">{error}</div></div>}

      <div className="panel mb-4">
        <p className="note mb-3">
          他店舗でもらった見積書を撮影すると、AIが金額・項目を自動で読み取って保存します。「店舗に共有する」をONにすると、この店舗のスタッフも内容を見られるようになります。OFFのままなら、あなただけが見られます。
        </p>

        {vehicles.length > 1 && (
          <label className="field-label mb-3 block">
            対象の車両
            <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.carName || '-'}{v.commonModelName ? ` ${v.commonModelName}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field-label mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={shareWithShop}
            onChange={(e) => setShareWithShop(e.target.checked)}
          />
          この店舗に共有する
        </label>

        <label className="btn btn-blue" style={{ cursor: 'pointer', display: 'inline-block' }}>
          {uploading ? '解析中...' : '📷 見積を撮影・アップロード'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            disabled={uploading || !vehicleId}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {list && (
        list.length === 0 ? (
          <div className="panel"><div className="empty">まだ保存された見積はありません。</div></div>
        ) : (
          list.map((c) => (
            <div key={c.id} className="panel mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold">{c.shopName || '店舗名不明'}</span>
                  {c.estimateDate && (
                    <span className="ml-2 mono text-xs text-[var(--muted)]">{c.estimateDate}</span>
                  )}
                  <div className="mt-1">
                    <span className={c.sharedWithShop ? 'badge-ok' : 'expbadge'}>
                      {c.sharedWithShop ? '✅ この店舗に共有中' : '🔒 自分だけ'}
                    </span>
                  </div>
                </div>
                {c.totalAmount != null && (
                  <span className="mono text-[var(--blue)] font-bold">
                    ¥{Number(c.totalAmount).toLocaleString()}
                  </span>
                )}
              </div>
              {Array.isArray(c.items) && c.items.length > 0 && (
                <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                  {c.items.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {it.name}
                        {it.oilGrade && <span className="ml-2">{it.oilGrade}</span>}
                        {it.quantity != null && <span className="ml-2">{it.quantity}L</span>}
                        {it.unitPrice != null && (
                          <span className="ml-2">単価¥{Number(it.unitPrice).toLocaleString()}/L</span>
                        )}
                        {it.laborCost != null && (
                          <span className="ml-2">工賃¥{Number(it.laborCost).toLocaleString()}</span>
                        )}
                      </span>
                      {it.cost != null && <span className="mono">¥{Number(it.cost).toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )
      )}
      </div>
    </>
  );
}
