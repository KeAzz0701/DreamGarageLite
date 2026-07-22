// frontend/app/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Customer = {
  id: number;
  customerName: string;
  createdAt: string;
  vehicles: unknown[];
};

type Reservation = {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED';
  scheduledStart: string;
  customer: { customerName: string } | null;
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]}) ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Home() {
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);

  useEffect(() => {
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

    api<Reservation[]>('/reservation')
      .then((data) => {
        const upcoming = data
          .filter((r) => r.status === 'PENDING' || r.status === 'CONFIRMED')
          .sort(
            (a, b) =>
              new Date(a.scheduledStart).getTime() -
              new Date(b.scheduledStart).getTime(),
          );

        setUpcomingReservations(upcoming.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="statgrid">
        <Link href="/ocr" className="statcard block">
          <div className="num">📷</div>
          <div className="lbl">車検証OCR</div>
        </Link>

        <Link href="/reservations" className="statcard block">
          <div className="num">📅</div>
          <div className="lbl">予約管理</div>
        </Link>

        <Link href="/customers" className="statcard block">
          <div className="num">👥</div>
          <div className="lbl">顧客一覧</div>
        </Link>
      </div>

      <div className="sectionhead">
        <h3>📅 直近の予約</h3>
        <a href="/reservations">一覧を見る →</a>
      </div>
      {upcomingReservations.length === 0 ? (
        <div className="empty">直近の予約はありません。</div>
      ) : (
        upcomingReservations.map((r) => (
          <div key={r.id} className="minirow">
            <span className="l">
              {fmt(r.scheduledStart)} {r.customer?.customerName ?? '不明な顧客'}
            </span>
            <span className="r">
              {r.status === 'PENDING' ? '未確定' : '確定済み'}
            </span>
          </div>
        ))
      )}

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
