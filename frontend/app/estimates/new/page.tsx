// frontend/app/estimates/new/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';
import { normalizeForSearch } from '@/lib/kana';
import { inferVehicleCategory } from '@/lib/vehicleCategory';
import {
  EstimateItemRow,
  emptyEstimateItem,
  laborEstimateItem,
  type EstimateItemDraft,
} from '@/components/estimate/EstimateItemRow';

type Mode = 'vehicle' | 'customer' | 'freeform';

type EstimateCategory = 'GENERAL' | 'SHAKEN' | 'INSPECTION_12M' | 'INSPECTION_6M' | 'WARRANTY';

const CATEGORY_OPTIONS: { value: EstimateCategory; label: string }[] = [
  { value: 'GENERAL', label: '一般整備' },
  { value: 'SHAKEN', label: '車検整備' },
  { value: 'INSPECTION_12M', label: '12ヶ月点検' },
  { value: 'INSPECTION_6M', label: '6ヶ月点検' },
  { value: 'WARRANTY', label: '保証整備' },
];

export default function NewEstimatePage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('vehicle');

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerNameFreeText, setCustomerNameFreeText] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');

  const [title, setTitle] = useState('');
  const [staffName, setStaffName] = useState('');
  const [category, setCategory] = useState<EstimateCategory>('GENERAL');
  const [vehicleCategory, setVehicleCategory] = useState('REGULAR');
  const [items, setItems] = useState<EstimateItemDraft[]>([emptyEstimateItem()]);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [laborRatePerHour, setLaborRatePerHour] = useState<number | null>(null);

  useEffect(() => {
    api<any[]>('/vehicle').then(setVehicles).catch(() => {});
    api<any[]>('/customer').then(setCustomers).catch(() => {});

    (async () => {
      try {
        const company = await api<any>('/company');
        if (!company) return;
        const settings = await api<any>(`/settings/${company.id}`);
        setLaborRatePerHour(settings?.laborRatePerHour ?? null);
      } catch {}
    })();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const text = normalizeForSearch(
      `${v.registrationNumber} ${v.vin} ${v.carName} ${v.commonModelName} ${v.model} ${v.customer?.customerName}`,
    );
    return text.includes(normalizeForSearch(keyword));
  });

  const filteredCustomers = customers.filter((c) =>
    normalizeForSearch(`${c.customerName} ${c.customerNameReading ?? ''}`).includes(
      normalizeForSearch(keyword),
    ),
  );

  function updateItem(index: number, patch: Partial<EstimateItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  const total = items.reduce(
    (sum, it) =>
      sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) + (Number(it.laborCost) || 0),
    0,
  );

  async function suggestShakenItems() {
    if (!selectedVehicle) return;

    setSuggesting(true);

    try {
      const result = await api<{ items: any[]; note: string }>(
        `/vehicle/${selectedVehicle.id}/estimates/suggest-shaken-items`,
        {
          method: 'POST',
          body: JSON.stringify({ vehicleCategory }),
        },
      );

      setItems(
        result.items.map((i) => ({
          name: i.name,
          quantity: String(i.quantity ?? 1),
          unitPrice: i.unitPrice ? String(i.unitPrice) : '',
          laborCost: i.laborCost ? String(i.laborCost) : '',
          isFee: i.isFee ?? true,
        })),
      );

      if (!title) setTitle('車検見積');

      if (result.note) alert(`AIによる概算メモ:\n${result.note}`);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      alert('件名を入力してください');
      return;
    }

    setSaving(true);

    try {
      const result = await api<{ id: number }>('/estimates', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: mode === 'vehicle' ? selectedVehicle?.id : undefined,
          customerId: mode === 'customer' ? selectedCustomer?.id : undefined,
          customerNameFreeText: mode === 'freeform' ? customerNameFreeText : undefined,
          vehicleDescription: mode === 'freeform' ? vehicleDescription : undefined,
          title,
          category,
          staffName,
          items: items
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              laborCost: Number(i.laborCost) || 0,
              isFee: i.isFee,
            })),
        }),
      });

      router.push(`/estimates/${result.id}/print`);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="estimate-new-shell">
      <div className="flex justify-between items-center mb-6 estimate-header">
        <h1 className="disp text-3xl">見積書作成</h1>
        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">対象</h2>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('vehicle')}
            className={`btn btn-sm ${mode === 'vehicle' ? 'btn-blue' : 'btn-ghost'}`}
          >
            🚗 車両から選ぶ
          </button>
          <button
            onClick={() => setMode('customer')}
            className={`btn btn-sm ${mode === 'customer' ? 'btn-blue' : 'btn-ghost'}`}
          >
            👤 顧客のみ選ぶ
          </button>
          <button
            onClick={() => setMode('freeform')}
            className={`btn btn-sm ${mode === 'freeform' ? 'btn-blue' : 'btn-ghost'}`}
          >
            📝 未登録・自由入力
          </button>
        </div>

        {mode !== 'freeform' && (
          <input
            className="input mb-2"
            placeholder={mode === 'vehicle' ? '登録番号・車台番号・車名・顧客名で検索' : '顧客名で検索'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        )}

        {mode === 'vehicle' && (
          <div className="max-h-64 overflow-y-auto">
            {selectedVehicle ? (
              <div className="veh flex justify-between items-center">
                <span>
                  {selectedVehicle.carName} {selectedVehicle.commonModelName}（
                  {selectedVehicle.registrationNumber ?? '登録番号未登録'}）／
                  {selectedVehicle.customer?.customerName ?? '顧客未登録'}
                </span>
                <button className="btn-icon" onClick={() => setSelectedVehicle(null)}>
                  ✕
                </button>
              </div>
            ) : (
              filteredVehicles.slice(0, 20).map((v) => (
                <div
                  key={v.id}
                  className="minirow cursor-pointer"
                  onClick={() => {
                    setSelectedVehicle(v);
                    setVehicleCategory(inferVehicleCategory(v));
                  }}
                >
                  <span className="l">
                    {v.carName} {v.commonModelName}（{v.registrationNumber ?? '登録番号未登録'}）
                  </span>
                  <span className="r">{v.customer?.customerName ?? '顧客未登録'}</span>
                </div>
              ))
            )}
          </div>
        )}

        {mode === 'customer' && (
          <div className="max-h-64 overflow-y-auto">
            {selectedCustomer ? (
              <div className="veh flex justify-between items-center">
                <span>{selectedCustomer.customerName} 様</span>
                <button className="btn-icon" onClick={() => setSelectedCustomer(null)}>
                  ✕
                </button>
              </div>
            ) : (
              filteredCustomers.slice(0, 20).map((c) => (
                <div
                  key={c.id}
                  className="minirow cursor-pointer"
                  onClick={() => setSelectedCustomer(c)}
                >
                  <span className="l">{c.customerName} 様</span>
                  <span className="r">車両{c.vehicles?.length ?? 0}台</span>
                </div>
              ))
            )}
          </div>
        )}

        {mode === 'freeform' && (
          <div className="grid2">
            <label className="field-label">
              お客様名
              <input
                className="input"
                placeholder="例: 山田 太郎"
                value={customerNameFreeText}
                onChange={(e) => setCustomerNameFreeText(e.target.value)}
              />
            </label>
            <label className="field-label">
              車両（わかる範囲で）
              <input
                className="input"
                placeholder="例: トヨタ プリウス 白"
                value={vehicleDescription}
                onChange={(e) => setVehicleDescription(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="disp text-xl mb-3">見積内容</h2>

        <div className="grid2 mb-3">
          <label className="field-label">
            件名
            <input
              className="input"
              placeholder="例: 車検見積"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field-label">
            担当
            <input
              className="input"
              placeholder="担当者名"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
          </label>

          <label className="field-label">
            分類
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as EstimateCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {category === 'SHAKEN' && (
            <label className="field-label">
              車両区分
              <select
                className="input"
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value)}
              >
                <option value="KEI">軽自動車</option>
                <option value="REGULAR">普通乗用</option>
                <option value="LARGE">大型・特殊</option>
                <option value="CARGO">貨物自動車</option>
              </select>
            </label>
          )}
        </div>

        {category === 'SHAKEN' && (
          <button
            onClick={suggestShakenItems}
            disabled={suggesting || !selectedVehicle}
            className="btn btn-primary btn-sm mb-3"
            title={!selectedVehicle ? '車両を選ぶとAI自動入力が使えます' : ''}
          >
            {suggesting ? 'AIが算出中...' : '🤖 AIで自動入力(重量税など)'}
          </button>
        )}

        <div className="kicker mono text-xs text-[var(--muted)]">項目</div>
        {items.map((item, i) => (
          <EstimateItemRow
            key={i}
            item={item}
            onChange={(patch) => updateItem(i, patch)}
            onRemove={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        <div className="flex gap-2">
          <button
            onClick={() => setItems((prev) => [...prev, emptyEstimateItem()])}
            className="btn-dashed"
          >
            ➕ 項目を追加
          </button>
          <button
            onClick={() => setItems((prev) => [...prev, laborEstimateItem(laborRatePerHour)])}
            className="btn-dashed"
          >
            ➕ 工賃を追加
          </button>
        </div>

        <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="font-bold">合計</span>
          <span className="mono text-[var(--blue)] font-bold text-lg">
            ¥{total.toLocaleString()}
          </span>
        </div>

        <div className="btnrow flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="btn btn-blue">
            {saving ? '作成中...' : '見積書を作成する'}
          </button>
        </div>
      </div>
    </div>
  );
}
