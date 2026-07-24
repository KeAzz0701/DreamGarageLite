// frontend/app/vehicle/[id]/print/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PrintItemsTable } from '@/components/estimate/PrintItemsTable';

type Tab = 'sales' | 'invoice' | 'correction';

export default function VehiclePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [vehicle, setVehicle] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  const [tab, setTab] = useState<Tab>(
    searchParams.get('tab') === 'invoice'
      ? 'invoice'
      : searchParams.get('tab') === 'correction'
        ? 'correction'
        : 'sales',
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    searchParams.get('historyId') ? Number(searchParams.get('historyId')) : null,
  );
  const [correctionId, setCorrectionId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const v = await api<any>(`/vehicle/${params.id}`);
    setVehicle(v);

    if (!selectedId && v.serviceHistories?.length > 0) {
      setSelectedId(v.serviceHistories[0].id);
    }

    const c = await api<any>('/company');
    setCompany(c);

    const s = await api<any>(`/settings/${c.id}`);
    setSettings(s);
  }

  const histories: any[] = vehicle?.serviceHistories ?? [];

  const salesTotal = useMemo(
    () =>
      histories.reduce(
        (sum, h) => sum + h.items.reduce((s: number, i: any) => s + i.cost, 0),
        0,
      ),
    [histories],
  );

  const selected = histories.find((h) => h.id === selectedId) ?? null;

  const correctionPairs = histories.filter((h) => h.correctedFromId);
  const selectedCorrection =
    correctionPairs.find((h) => h.id === correctionId) ?? correctionPairs[0] ?? null;
  const redEntry = selectedCorrection
    ? (histories.find((h) => h.id === selectedCorrection.correctedFromId) ?? null)
    : null;

  useEffect(() => {
    if (!vehicle) return;

    const customerName = vehicle.customer?.customerName ?? '売上';
    const dateStr =
      tab === 'invoice' && selected
        ? selected.date.slice(0, 10).replace(/-/g, '')
        : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const kind =
      tab === 'invoice' ? '納品書請求書' : tab === 'correction' ? '赤黒伝票' : '売上表';

    document.title = `${customerName}_${dateStr}_${kind}`;
  }, [vehicle, tab, selected]);

  if (!vehicle || !company || !settings) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  const customer = vehicle.customer;
  const vehicleLabel = [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ');

  return (
    <div className="print-sheet">
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
          main { max-width: none !important; padding: 0 !important; }
        }
        .print-sheet {
          background: white;
          padding: 32px;
          max-width: 720px;
          margin: 0 auto;
          color: #1e2023;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .print-table th, .print-table td {
          border: 1px solid #cfcabf;
          padding: 8px 10px;
          font-size: 13px;
          text-align: left;
        }
        .print-table th {
          background: #eae7e0;
        }
        @media screen and (max-width: 560px) {
          .print-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .print-table {
            min-width: 480px;
          }
        }
      `}</style>

      <div className="no-print mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('sales')}
            className={`btn btn-sm ${tab === 'sales' ? 'btn-blue' : 'btn-ghost'}`}
          >
            📊 売上表
          </button>
          <button
            onClick={() => setTab('invoice')}
            className={`btn btn-sm ${tab === 'invoice' ? 'btn-blue' : 'btn-ghost'}`}
          >
            🧾 納品書・請求書
          </button>
          <button
            onClick={() => setTab('correction')}
            className={`btn btn-sm ${tab === 'correction' ? 'btn-blue' : 'btn-ghost'}`}
          >
            🔴⚫ 赤黒伝票
          </button>
        </div>

        <button onClick={() => window.print()} className="btn btn-primary">
          🖨 印刷する
        </button>
      </div>

      {tab === 'invoice' && histories.length > 0 && (
        <div className="no-print mb-4">
          <label className="field-label">
            対象の整備履歴
            <select
              className="input"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {histories.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.date.slice(0, 10)} {h.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === 'correction' && correctionPairs.length > 0 && (
        <div className="no-print mb-4">
          <label className="field-label">
            対象の訂正
            <select
              className="input"
              value={selectedCorrection?.id ?? ''}
              onChange={(e) => setCorrectionId(Number(e.target.value))}
            >
              {correctionPairs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.date.slice(0, 10)} {h.title}(訂正後)
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === 'correction' ? (
        !selectedCorrection || !redEntry ? (
          <div className="empty">この車両にはまだ訂正(赤黒伝票)の対象がありません。</div>
        ) : (
          <>
            <h1 className="disp text-2xl text-center mb-1">赤黒伝票</h1>
            <div className="text-center text-xs text-[var(--muted)] mb-6">
              {customer?.customerName ?? '-'} 様／{vehicleLabel || '車両'}（
              {vehicle.registrationNumber ?? '登録番号未登録'}）
            </div>

            <div className="flex justify-between mb-6">
              <div>
                <div className="text-xs text-[var(--muted)]">お客様</div>
                <div className="font-bold text-lg">{customer?.customerName ?? '-'} 様</div>
                <div className="text-sm">{customer?.customerAddress}</div>
              </div>

              <div className="text-right text-sm">
                <div>発行日: {new Date().toISOString().slice(0, 10)}</div>
                <div className="mt-3 font-bold">{company.companyName}</div>
                <div>{company.address}</div>
                <div>TEL: {company.phone}</div>
              </div>
            </div>

            <div className="font-bold text-sm mb-1" style={{ color: '#c0392b' }}>
              🔴 赤伝（取消）— {redEntry.date.slice(0, 10)} {redEntry.title}
            </div>
            <div className="print-table-wrap">
              <table className="print-table" style={{ color: '#c0392b' }}>
                <thead>
                  <tr>
                    <th>項目</th>
                    <th style={{ width: 50, textAlign: 'center' }}>数量</th>
                    <th style={{ width: 90, textAlign: 'right' }}>単価</th>
                    <th style={{ width: 100, textAlign: 'right' }}>金額</th>
                  </tr>
                </thead>
                <tbody>
                  {redEntry.items.map((it: any) => (
                    <tr key={it.id}>
                      <td style={{ textDecoration: 'line-through' }}>{it.name}</td>
                      <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>¥{it.unitPrice.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        -¥{it.cost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="font-bold">
                      赤伝合計
                    </td>
                    <td className="font-bold mono" style={{ textAlign: 'right' }}>
                      -¥
                      {redEntry.items
                        .reduce((s: number, i: any) => s + i.cost, 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="font-bold text-sm mt-6 mb-1">
              ⚫ 黒伝（訂正後）— {selectedCorrection.date.slice(0, 10)} {selectedCorrection.title}
            </div>
            <PrintItemsTable items={selectedCorrection.items} totalRowLabel="訂正後金額" />

            <div
              className="flex justify-between mt-4 pt-3"
              style={{ borderTop: '2px solid #1e2023' }}
            >
              <span className="font-bold">差引（黒伝 − 赤伝）</span>
              <span className="font-bold mono">
                ¥
                {(
                  selectedCorrection.items.reduce((s: number, i: any) => s + i.cost, 0) -
                  redEntry.items.reduce((s: number, i: any) => s + i.cost, 0)
                ).toLocaleString()}
              </span>
            </div>
          </>
        )
      ) : tab === 'sales' ? (
        <>
          <h1 className="disp text-2xl text-center mb-1">売上表</h1>
          <div className="text-center text-xs text-[var(--muted)] mb-6">
            {customer?.customerName ?? '-'} 様／{vehicleLabel || '車両'}（
            {vehicle.registrationNumber ?? '登録番号未登録'}）
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <div className="text-xs text-[var(--muted)]">お客様</div>
              <div className="font-bold text-lg">{customer?.customerName ?? '-'} 様</div>
              <div className="text-sm">{customer?.customerAddress}</div>
            </div>

            <div className="text-right text-sm">
              <div>発行日: {new Date().toISOString().slice(0, 10)}</div>
              <div className="mt-3 font-bold">{company.companyName}</div>
              <div>{company.address}</div>
              <div>TEL: {company.phone}</div>
            </div>
          </div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>作業内容</th>
                  <th style={{ width: 120, textAlign: 'right' }}>金額</th>
                </tr>
              </thead>
              <tbody>
                {histories.length === 0 ? (
                  <tr>
                    <td colSpan={3}>整備履歴はまだありません。</td>
                  </tr>
                ) : (
                  histories.map((h) => {
                    const subtotal = h.items.reduce((s: number, i: any) => s + i.cost, 0);
                    return (
                      <tr key={h.id}>
                        <td>{h.date.slice(0, 10)}</td>
                        <td>{h.title}</td>
                        <td style={{ textAlign: 'right' }}>¥{subtotal.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
                <tr>
                  <td colSpan={2} className="font-bold">
                    合計
                  </td>
                  <td className="font-bold mono" style={{ textAlign: 'right' }}>
                    ¥{salesTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : !selected ? (
        <div className="empty">整備履歴がまだないため、納品書・請求書を作成できません。</div>
      ) : (
        <>
          <h1 className="disp text-2xl text-center mb-1">納品書 ／ 請求書</h1>
          <div className="text-center text-xs text-[var(--muted)] mb-6">{selected.title}</div>

          <div className="flex justify-between mb-6">
            <div>
              <div className="text-xs text-[var(--muted)]">お客様</div>
              <div className="font-bold text-lg">{customer?.customerName ?? '-'} 様</div>
              <div className="text-sm">{customer?.customerAddress}</div>

              <div className="mt-3 text-xs text-[var(--muted)]">対象車両</div>
              <div className="text-sm">
                {vehicleLabel} （{vehicle.registrationNumber ?? '登録番号未登録'}）
              </div>
            </div>

            <div className="text-right text-sm">
              <div>納品日: {selected.date.slice(0, 10)}</div>
              <div className="mt-3 font-bold">{company.companyName}</div>
              <div>{company.address}</div>
              <div>TEL: {company.phone}</div>
              {company.invoiceNumber && <div>登録番号: {company.invoiceNumber}</div>}
            </div>
          </div>

          <PrintItemsTable items={selected.items} totalRowLabel="ご請求金額" />

          {settings.bankName && (
            <div className="mt-6 text-xs">
              <div className="font-semibold mb-1">お振込先</div>
              <div>
                {settings.bankName}
                {settings.bankBranchName && ` ${settings.bankBranchName}支店`}
                {settings.bankAccountType && ` ${settings.bankAccountType}`}
                {settings.bankAccountNumber && ` ${settings.bankAccountNumber}`}
              </div>
              {settings.bankAccountHolder && <div>名義: {settings.bankAccountHolder}</div>}
            </div>
          )}

          {settings.estimateTerms && (
            <div className="mt-6 text-xs text-[var(--muted)] whitespace-pre-wrap">
              {settings.estimateTerms}
            </div>
          )}
        </>
      )}
    </div>
  );
}
