// frontend/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCompany } from '@/hooks/useCompany';

type Summary = {
  customers: number;
  vehicles: number;
};

type Customer = {
  id: number;
  customerName: string;
  createdAt: string;
  vehicles: unknown[];
};

export default function Home() {
  const { company } = useCompany();

  const [summary, setSummary] = useState<Summary>({
    customers: 0,
    vehicles: 0,
  });

  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api<{ summary: Summary }>('')
      .then((data) => setSummary(data.summary))
      .catch(() => {});

    api<Customer[]>('/customer')
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );

        setRecentCustomers(sorted.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const usedOcr = company?.license?.usedOcr ?? 0;
  const maxOcr = company?.license?.maxOcrPerMonth ?? 0;
  const ocrLabel = maxOcr === -1 ? '∞' : `${usedOcr}/${maxOcr}`;

  return (
    <>
      <div className="statgrid">
        <div className="statcard">
          <div className="num mono">{summary.customers}</div>
          <div className="lbl">👥 登録顧客</div>
        </div>

        <div className="statcard">
          <div className="num mono">{summary.vehicles}</div>
          <div className="lbl">🚗 登録車両</div>
        </div>

        <div className="statcard">
          <div className="num mono">{ocrLabel}</div>
          <div className="lbl">📷 今月のOCR利用</div>
        </div>
      </div>

      <div className="sectionhead">
        <h3>📅 直近の予約</h3>
      </div>
      <div className="empty">直近の予約はありません。</div>

      <div className="sectionhead">
        <h3>🕒 最近登録した顧客</h3>
        <a href="/customers">一覧を見る →</a>
      </div>
      {recentCustomers.length === 0 ? (
        <div className="empty">まだ顧客が登録されていません。</div>
      ) : (
        recentCustomers.map((c) => (
          <div key={c.id} className="minirow">
            <span className="l">{c.customerName}</span>
            <span className="r">車両{c.vehicles.length}台</span>
          </div>
        ))
      )}
    </>
  );
}
