// frontend/app/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatFlexibleDate } from '@/lib/japaneseDate';

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

type ShakenReminder = {
  vehicleId: number;
  customerId: number;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string | null;
  expirationDate: string;
  daysRemaining: number;
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
  const [shakenReminders, setShakenReminders] = useState<ShakenReminder[]>([]);

  useEffect(() => {
    loadShakenReminders();
  }, []);

  function loadShakenReminders() {
    api<ShakenReminder[]>('/vehicle/shaken-reminders')
      .then(setShakenReminders)
      .catch(() => {});
  }

  async function dismissShakenReminder(vehicleId: number) {
    const reason = prompt(
      'よろしければ状況を教えてください(例: 他店でご成約、様子見など。空欄のままでも大丈夫です)',
    );

    if (reason === null) return; // キャンセル

    await api(`/vehicle/${vehicleId}/shaken-reminder/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || undefined }),
    });

    loadShakenReminders();
  }

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

        <Link href="/ai-chat" className="statcard block">
          <div className="num">🤖</div>
          <div className="lbl">AIチャット</div>
        </Link>
      </div>

      {shakenReminders.length > 0 && (
        <>
          <div className="sectionhead">
            <h3>🚗 そろそろ車検のお客様</h3>
          </div>
          {shakenReminders.map((r) => (
            <div key={r.vehicleId} className="minirow">
              <span className="l">
                <Link href={`/customers/${r.customerId}`} className="text-[var(--blue)]">
                  {r.customerName}様 {r.vehicleLabel}
                  {r.registrationNumber ? `(${r.registrationNumber})` : ''}
                </Link>
                　車検満了: {formatFlexibleDate(r.expirationDate)}
                {r.daysRemaining >= 0 && (
                  <span className="ml-1 text-[var(--muted)]">(あと{r.daysRemaining}日)</span>
                )}
              </span>
              <span className="r">
                <button
                  onClick={() => dismissShakenReminder(r.vehicleId)}
                  className="btn btn-ghost btn-sm"
                >
                  今回はそっとしておく
                </button>
              </span>
            </div>
          ))}
        </>
      )}

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
