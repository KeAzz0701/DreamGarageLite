// frontend/app/vehicle/[id]/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

const FIELD_GROUPS = [
  {
    title: '基本情報',
    fields: [
      ['registrationNumber', '登録番号'],
      ['vin', '車台番号'],
      ['carName', '車名'],
      ['commonModelName', '車種名'],
      ['model', '型式'],
      ['engineModel', '原動機の型式'],
      ['modelCode', '型式指定番号'],
      ['classificationCode', '類別区分番号'],
    ],
  },
  {
    title: '所有者・使用者',
    fields: [
      ['ownerName', '所有者'],
      ['ownerAddress', '所有者住所'],
      ['userName', '使用者'],
      ['userAddress', '使用者住所'],
      ['usageBase', '使用の本拠の位置'],
    ],
  },
  {
    title: '登録・有効期限',
    fields: [
      ['firstRegistration', '初度登録年月'],
      ['expirationDate', '車検有効期限'],
    ],
  },
  {
    title: '諸元',
    fields: [
      ['vehicleWeight', '車両重量'],
      ['grossWeight', '車両総重量'],
      ['seatingCapacity', '乗車定員'],
      ['maxLoad', '最大積載量'],
      ['length', '長さ(mm)'],
      ['width', '幅(mm)'],
      ['height', '高さ(mm)'],
      ['displacement', '総排気量'],
      ['fuel', '燃料の種類'],
    ],
  },
  {
    title: 'その他',
    fields: [
      ['usage', '用途'],
      ['privateBusiness', '自家用・事業用'],
      ['bodyType', '車体の形状'],
      ['remarks', '備考'],
    ],
  },
] as const;

const emptyItem = () => ({ name: '', cost: '' });

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [estimates, setEstimates] = useState<any[]>([]);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceItems, setServiceItems] = useState([emptyItem()]);

  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [estimateTitle, setEstimateTitle] = useState('');
  const [estimateItems, setEstimateItems] = useState([emptyItem()]);
  const [estimateCategory, setEstimateCategory] = useState<'GENERAL' | 'SHAKEN'>('GENERAL');
  const [estimateStaffName, setEstimateStaffName] = useState('');
  const [estimateVehicleCategory, setEstimateVehicleCategory] = useState('REGULAR');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    load();
    loadEstimates();
  }, []);

  async function load() {
    try {
      const json = await api<any>(`/vehicle/${params.id}`);

      if (!json) {
        setNotFound(true);
        return;
      }

      setVehicle(json);
    } catch {
      setNotFound(true);
    }
  }

  async function loadEstimates() {
    try {
      const json = await api<any[]>(`/vehicle/${params.id}/estimates`);
      setEstimates(json);
    } catch {}
  }

  async function saveServiceHistory() {
    try {
      await api(`/vehicle/${params.id}/service-history`, {
        method: 'POST',
        body: JSON.stringify({
          date: serviceDate || new Date().toISOString().slice(0, 10),
          title: serviceTitle,
          items: serviceItems.filter((i) => i.name.trim()),
        }),
      });

      setShowServiceForm(false);
      setServiceDate('');
      setServiceTitle('');
      setServiceItems([emptyItem()]);
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function deleteServiceHistory(id: number) {
    await api(`/service-history/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveEstimate() {
    try {
      await api(`/vehicle/${params.id}/estimates`, {
        method: 'POST',
        body: JSON.stringify({
          title: estimateTitle,
          category: estimateCategory,
          staffName: estimateStaffName,
          items: estimateItems.filter((i) => i.name.trim()),
        }),
      });

      setShowEstimateForm(false);
      setEstimateTitle('');
      setEstimateStaffName('');
      setEstimateCategory('GENERAL');
      setEstimateItems([emptyItem()]);
      await loadEstimates();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function suggestShakenItems() {
    setSuggesting(true);

    try {
      const result = await api<{ items: any[]; note: string }>(
        `/vehicle/${params.id}/estimates/suggest-shaken-items`,
        {
          method: 'POST',
          body: JSON.stringify({ vehicleCategory: estimateVehicleCategory }),
        },
      );

      setEstimateItems(
        result.items.map((i) => ({ name: i.name, cost: String(i.cost) })),
      );

      if (!estimateTitle) setEstimateTitle('車検見積');

      if (result.note) {
        alert(`AIによる概算メモ:\n${result.note}`);
      }
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function deleteEstimate(id: number) {
    await api(`/estimates/${id}`, { method: 'DELETE' });
    await loadEstimates();
  }

  async function convertEstimate(id: number) {
    await api(`/estimates/${id}/convert-to-service-history`, {
      method: 'POST',
    });

    alert('整備履歴に登録しました');
    await load();
  }

  function convertAndPrint(id: number) {
    // ポップアップブロック対策のため、クリック直後(await前)に同期的にタブを開く
    window.open(`/estimates/${id}/print`, '_blank');
    convertEstimate(id);
  }

  function updateServiceItem(index: number, field: 'name' | 'cost', value: string) {
    setServiceItems((items) =>
      items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function updateEstimateItem(index: number, field: 'name' | 'cost', value: string) {
    setEstimateItems((items) =>
      items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function update(key: string, value: string) {
    setVehicle((prev: any) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);

    try {
      await api(`/vehicle/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(vehicle),
      });

      alert('車両情報を保存しました');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api(`/vehicle/${params.id}`, { method: 'DELETE' });
    router.replace('/vehicle');
  }

  if (notFound) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="disp text-3xl">車両詳細</h1>
          <Link href="/vehicle" className="btn btn-ghost">
            戻る
          </Link>
        </div>
        <div className="empty">この車両は見つかりませんでした。</div>
      </>
    );
  }

  if (!vehicle) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">車両詳細</h1>

        <Link href="/vehicle" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel mb-4">
        <div className="text-xs text-[var(--muted)]">所有者</div>
        {vehicle.customer ? (
          <Link
            href={`/customers/${vehicle.customer.id}`}
            className="cname disp text-xl text-[var(--blue)]"
          >
            {vehicle.customer.customerName}
          </Link>
        ) : (
          <div className="cname disp text-xl">未登録</div>
        )}
      </div>

      <div className="panel">
        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="fieldgroup mb-5">
            <div className="grouptitle text-xs font-semibold border-b border-[var(--line)] pb-1 mb-3">
              {group.title}
            </div>

            <div className="grid2">
              {group.fields.map(([key, label]) => (
                <label key={key} className="field-label">
                  {label}
                  <input
                    className="input"
                    value={vehicle[key] ?? ''}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? '保存中...' : '💾 保存する'}
          </button>

          {confirmDelete ? (
            <>
              <button onClick={remove} className="btn btn-danger">
                削除する
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost"
              >
                やめる
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost"
            >
              🗑 削除
            </button>
          )}
        </div>
      </div>

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">整備履歴</h2>
          {!showServiceForm && (
            <button
              onClick={() => setShowServiceForm(true)}
              className="btn btn-blue btn-sm"
            >
              ➕ 記録を追加
            </button>
          )}
        </div>

        {showServiceForm && (
          <div className="veh mb-3">
            <div className="grid2">
              <label className="field-label">
                日付
                <input
                  type="date"
                  className="input"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </label>
              <label className="field-label">
                作業内容
                <input
                  className="input"
                  placeholder="例: 車検、オイル交換"
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                />
              </label>
            </div>

            <div className="kicker mono mt-3 text-xs text-[var(--muted)]">項目</div>
            {serviceItems.map((item, i) => (
              <div key={i} className="shitemrow">
                <input
                  className="input"
                  placeholder="項目名"
                  value={item.name}
                  onChange={(e) => updateServiceItem(i, 'name', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="費用(円)"
                  value={item.cost}
                  onChange={(e) => updateServiceItem(i, 'cost', e.target.value)}
                />
                <button
                  className="btn-icon"
                  onClick={() =>
                    setServiceItems((items) => items.filter((_, idx) => idx !== i))
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => setServiceItems((items) => [...items, emptyItem()])}
              className="btn-dashed"
            >
              ➕ 項目を追加
            </button>

            <div className="btnrow flex gap-2 mt-3">
              <button onClick={saveServiceHistory} className="btn btn-blue btn-sm">
                記録する
              </button>
              <button
                onClick={() => setShowServiceForm(false)}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {(vehicle.serviceHistories ?? []).length === 0 ? (
          <div className="empty">整備履歴はまだありません。</div>
        ) : (
          vehicle.serviceHistories.map((sh: any) => {
            const total = sh.items.reduce((s: number, i: any) => s + i.cost, 0);
            return (
              <div key={sh.id} className="veh mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="mono text-xs text-[var(--muted)]">
                      {sh.date.slice(0, 10)}
                    </span>{' '}
                    <span className="font-semibold">{sh.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[var(--blue)] font-bold">
                      ¥{total.toLocaleString()}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => deleteServiceHistory(sh.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {sh.items.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    {sh.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.name}</span>
                        <span className="mono">¥{it.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="panel mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="disp text-xl">見積書</h2>
          {!showEstimateForm && (
            <button
              onClick={() => setShowEstimateForm(true)}
              className="btn btn-blue btn-sm"
            >
              ➕ 見積を作成
            </button>
          )}
        </div>

        {showEstimateForm && (
          <div className="veh mb-3">
            <div className="grid2">
              <label className="field-label">
                件名
                <input
                  className="input"
                  placeholder="例: 車検見積"
                  value={estimateTitle}
                  onChange={(e) => setEstimateTitle(e.target.value)}
                />
              </label>

              <label className="field-label">
                担当
                <input
                  className="input"
                  placeholder="担当者名"
                  value={estimateStaffName}
                  onChange={(e) => setEstimateStaffName(e.target.value)}
                />
              </label>

              <label className="field-label">
                分類
                <select
                  className="input"
                  value={estimateCategory}
                  onChange={(e) =>
                    setEstimateCategory(e.target.value as 'GENERAL' | 'SHAKEN')
                  }
                >
                  <option value="GENERAL">一般整備</option>
                  <option value="SHAKEN">車検</option>
                </select>
              </label>

              {estimateCategory === 'SHAKEN' && (
                <label className="field-label">
                  車両区分
                  <select
                    className="input"
                    value={estimateVehicleCategory}
                    onChange={(e) => setEstimateVehicleCategory(e.target.value)}
                  >
                    <option value="KEI">軽自動車</option>
                    <option value="REGULAR">普通乗用</option>
                    <option value="LARGE">大型・特殊</option>
                    <option value="CARGO">貨物自動車</option>
                  </select>
                </label>
              )}
            </div>

            {estimateCategory === 'SHAKEN' && (
              <button
                onClick={suggestShakenItems}
                disabled={suggesting}
                className="btn btn-primary btn-sm mt-3"
              >
                {suggesting ? 'AIが算出中...' : '🤖 AIで自動入力(重量税など)'}
              </button>
            )}

            <div className="kicker mono mt-3 text-xs text-[var(--muted)]">項目</div>
            {estimateItems.map((item, i) => (
              <div key={i} className="shitemrow">
                <input
                  className="input"
                  placeholder="項目名"
                  value={item.name}
                  onChange={(e) => updateEstimateItem(i, 'name', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  step="100"
                  placeholder="費用(円)"
                  value={item.cost}
                  onChange={(e) => updateEstimateItem(i, 'cost', e.target.value)}
                />
                <button
                  className="btn-icon"
                  onClick={() =>
                    setEstimateItems((items) => items.filter((_, idx) => idx !== i))
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => setEstimateItems((items) => [...items, emptyItem()])}
              className="btn-dashed"
            >
              ➕ 項目を追加
            </button>

            <div className="btnrow flex gap-2 mt-3">
              <button onClick={saveEstimate} className="btn btn-blue btn-sm">
                作成する
              </button>
              <button
                onClick={() => setShowEstimateForm(false)}
                className="btn btn-ghost btn-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {estimates.length === 0 ? (
          <div className="empty">見積書はまだありません。</div>
        ) : (
          estimates.map((es) => {
            const total = es.items.reduce((s: number, i: any) => s + i.cost, 0);
            return (
              <div key={es.id} className="veh mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="mono text-xs text-[var(--muted)]">
                      {es.date.slice(0, 10)}
                    </span>{' '}
                    <span className="font-semibold">{es.title}</span>
                    {es.category === 'SHAKEN' && (
                      <span className="expbadge exp-warn ml-2">車検</span>
                    )}
                    {es.staffName && (
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        担当: {es.staffName}
                      </span>
                    )}
                  </div>
                  <span className="mono text-[var(--blue)] font-bold">
                    ¥{total.toLocaleString()}
                  </span>
                </div>

                {es.items.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    {es.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.name}</span>
                        <span className="mono">¥{it.cost.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="btnrow flex gap-2 mt-2">
                  <button
                    onClick={() => convertAndPrint(es.id)}
                    className="btn btn-primary btn-sm"
                  >
                    ✅🖨 整備履歴に登録して印刷
                  </button>
                  <button
                    onClick={() => deleteEstimate(es.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    🗑 削除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
