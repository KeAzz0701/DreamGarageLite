// frontend/app/estimates/[id]/print/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  SHAKEN: '車検',
  GENERAL: '一般整備',
};

export default function EstimatePrintPage() {
  const params = useParams();

  const [estimate, setEstimate] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const es = await api<any>(`/estimates/${params.id}`);
    setEstimate(es);

    const c = await api<any>('/company');
    setCompany(c);

    const s = await api<any>(`/settings/${c.id}`);
    setSettings(s);
  }

  if (!estimate || !company || !settings) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  const total = estimate.items.reduce((s: number, i: any) => s + i.cost, 0);
  const customer = estimate.vehicle?.customer;
  const vehicle = estimate.vehicle;

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
      `}</style>

      <div className="no-print mb-4 text-right">
        <button onClick={() => window.print()} className="btn btn-primary">
          🖨 印刷する
        </button>
      </div>

      <h1 className="disp text-2xl text-center mb-1">概算見積書</h1>
      <div className="text-center text-xs text-[var(--muted)] mb-6">
        {CATEGORY_LABEL[estimate.category] ?? ''}
        {estimate.staffName && ` ／ 担当: ${estimate.staffName}`}
      </div>

      <div className="flex justify-between mb-6">
        <div>
          <div className="text-xs text-[var(--muted)]">お客様</div>
          <div className="font-bold text-lg">{customer?.customerName ?? '-'} 様</div>
          <div className="text-sm">{customer?.customerAddress}</div>

          <div className="mt-3 text-xs text-[var(--muted)]">対象車両</div>
          <div className="text-sm">
            {vehicle?.carName} {vehicle?.commonModelName}（{vehicle?.registrationNumber}）
          </div>
        </div>

        <div className="text-right text-sm">
          <div>発行日: {estimate.date.slice(0, 10)}</div>
          <div className="mt-3 font-bold">{company.companyName}</div>
          <div>{company.address}</div>
          <div>TEL: {company.phone}</div>
          {company.invoiceNumber && (
            <div>登録番号: {company.invoiceNumber}</div>
          )}
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>項目</th>
            <th style={{ width: 120, textAlign: 'right' }}>金額</th>
          </tr>
        </thead>
        <tbody>
          {estimate.items.map((item: any) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td style={{ textAlign: 'right' }}>¥{item.cost.toLocaleString()}</td>
            </tr>
          ))}
          <tr>
            <td className="font-bold">合計</td>
            <td className="font-bold mono" style={{ textAlign: 'right' }}>
              ¥{total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {settings.estimateTerms && (
        <div className="mt-6 text-xs text-[var(--muted)] whitespace-pre-wrap">
          {settings.estimateTerms}
        </div>
      )}
    </div>
  );
}
