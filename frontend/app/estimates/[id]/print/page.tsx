// frontend/app/estimates/[id]/print/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PrintItemsTable } from '@/components/estimate/PrintItemsTable';
import { formatFlexibleDate } from '@/lib/japaneseDate';

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

    const customerName =
      es.vehicle?.customer?.customerName ?? es.customer?.customerName ?? es.customerNameFreeText;
    const dateStr = (es.date as string).slice(0, 10).replace(/-/g, '');
    document.title = `${customerName ?? '見積'}_${dateStr}_概算見積`;
  }

  if (!estimate || !company || !settings) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  const customer = estimate.vehicle?.customer ?? estimate.customer;
  const vehicle = estimate.vehicle;
  const vehicleName = vehicle
    ? `${vehicle.carName ?? ''} ${vehicle.commonModelName ?? ''}`.trim() || '車名未登録'
    : estimate.vehicleDescription || '未登録';
  const total = (estimate.items as any[]).reduce((s, i) => s + i.cost, 0);

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
        .print-vehicle-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .print-vehicle-table th, .print-vehicle-table td {
          border: 1px solid #cfcabf;
          padding: 6px 8px;
          font-size: 12px;
        }
        .print-vehicle-table th {
          background: #eae7e0;
          text-align: left;
          width: 96px;
          white-space: nowrap;
        }
        .print-vehicle-table td {
          text-align: left;
        }
        .print-total-box {
          border: 2px solid #1e2023;
          border-radius: 6px;
          padding: 10px 16px;
          text-align: right;
          min-width: 200px;
        }
        .print-legalfee-box {
          margin-top: 16px;
          border: 1px solid #cfcabf;
          border-radius: 6px;
          background: #f5f3ee;
          padding: 10px 14px;
        }
        .print-legalfee-title {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .print-legalfee-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          padding: 3px 0;
        }
        .print-legalfee-total {
          margin-top: 4px;
          padding-top: 6px;
          border-top: 1px solid #cfcabf;
          font-weight: 700;
        }
        @media screen and (max-width: 560px) {
          .print-table-wrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .print-table {
            min-width: 480px;
          }
          .print-header-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .print-total-box {
            align-self: stretch;
          }
        }
      `}</style>

      <div className="no-print mb-4 text-right">
        <button onClick={() => window.print()} className="btn btn-primary">
          🖨 印刷する
        </button>
      </div>

      <div className="flex justify-between items-start print-header-row">
        <div>
          <div className="font-bold text-lg">{company.companyName}</div>
          <div className="text-xs text-[var(--muted)]">{company.address}</div>
          <div className="text-xs text-[var(--muted)]">TEL: {company.phone}</div>
          {company.invoiceNumber && (
            <div className="text-xs text-[var(--muted)]">登録番号: {company.invoiceNumber}</div>
          )}
        </div>

        <div className="text-right">
          <div className="text-xs text-[var(--muted)] mb-1">発行日: {estimate.date.slice(0, 10)}</div>
          <div className="print-total-box">
            <div className="text-xs text-[var(--muted)]">お見積り金額</div>
            <div className="font-bold text-2xl mono">¥{total.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <h1 className="disp text-2xl text-center mt-6 mb-1">概算見積書</h1>
      <div className="text-center text-xs text-[var(--muted)] mb-6">
        {CATEGORY_LABEL[estimate.category] ?? ''}
        {estimate.staffName && ` ／ 担当: ${estimate.staffName}`}
      </div>

      <div className="mb-4">
        <div className="text-xs text-[var(--muted)]">お客様</div>
        <div className="font-bold text-lg">
          {customer?.customerName ?? estimate.customerNameFreeText ?? '-'} 様
        </div>
        <div className="text-sm">{customer?.customerAddress}</div>
      </div>

      <div className="print-table-wrap">
        <table className="print-vehicle-table">
          <tbody>
            <tr>
              <th>車名</th>
              <td>{vehicleName}</td>
              <th>登録番号</th>
              <td>{vehicle?.registrationNumber || '-'}</td>
            </tr>
            <tr>
              <th>型式</th>
              <td>{vehicle?.model || '-'}</td>
              <th>車台番号</th>
              <td className="mono">{vehicle?.vin || '-'}</td>
            </tr>
            <tr>
              <th>初度登録</th>
              <td>{formatFlexibleDate(vehicle?.firstRegistration) || '-'}</td>
              <th>車検満了日</th>
              <td>{formatFlexibleDate(vehicle?.expirationDate) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PrintItemsTable items={estimate.items} />

      {settings.estimateTerms && (
        <div className="mt-6 text-xs text-[var(--muted)] whitespace-pre-wrap">
          {settings.estimateTerms}
        </div>
      )}
    </div>
  );
}
