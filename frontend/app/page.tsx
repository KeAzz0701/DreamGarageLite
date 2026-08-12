// frontend/app/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatFlexibleDate } from '@/lib/japaneseDate';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { useCompany } from '@/hooks/useCompany';
import { usePlanLimits } from '@/lib/usePlanLimits';

type HomeSummary = {
  customers: number;
  vehicles: number;
  unreadLineMessages: number;
  pendingOcrSubmissions: number;
  pendingReservations: number | null;
  pendingShakenReminders: number;
};

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_LABELS[d.getDay()]})`;
}

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

type UnreadLineSummary = {
  customerId: number;
  customerName: string;
  count: number;
  hasImage: boolean;
  latestText: string;
  latestAt: string;
};

const UNREAD_LINE_POLL_MS = 20000;

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]}) ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Home() {
  const { company } = useCompany();
  const { plan } = usePlanLimits();
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [shakenReminders, setShakenReminders] = useState<ShakenReminder[]>([]);
  const [unreadLine, setUnreadLine] = useState<UnreadLineSummary[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    api<{ summary: HomeSummary }>('')
      .then((data) => setSummary(data.summary))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadUnreadLine();
    const interval = setInterval(loadUnreadLine, UNREAD_LINE_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  function loadUnreadLine() {
    api<UnreadLineSummary[]>('/customer/unread-line-summary')
      .then(setUnreadLine)
      .catch(() => {});
  }

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
    <div className="dash-shell">
      <div className="dash-greeting">
        <h1>おはようございます、{company?.companyName ?? ''}様</h1>
        <p>{todayLabel()}</p>
      </div>

      {plan === 'DEMO' && (
        <a
          href="https://room.rakuten.co.jp/room_0c1e9d21b8/1700388861567128"
          target="_blank"
          rel="noopener noreferrer"
          className="demo-ad-banner"
        >
          <span className="demo-ad-icon" aria-hidden>
            🚗
          </span>
          <span className="demo-ad-body">
            <span className="demo-ad-title">カー用品・カーケア用品はこちらもチェック</span>
            <span className="demo-ad-sub">先行導入モニター特典としてご紹介しています</span>
          </span>
        </a>
      )}

      {summary && (
        <div className="dash-kpi-row">
          <Link href="/customers" className="dash-kpi">
            <span className="dash-kpi-icon">👥</span>
            <span className="dash-kpi-figures">
              <span className="dash-kpi-value">{summary.customers}</span>
              <span className="dash-kpi-label">顧客数</span>
            </span>
          </Link>
          <Link href="/vehicle" className="dash-kpi">
            <span className="dash-kpi-icon">🚗</span>
            <span className="dash-kpi-figures">
              <span className="dash-kpi-value">{summary.vehicles}</span>
              <span className="dash-kpi-label">登録車両</span>
            </span>
          </Link>
          <Link href="/reservations" className="dash-kpi">
            <span className="dash-kpi-icon">📅</span>
            <span className="dash-kpi-figures">
              <span className="dash-kpi-value">{summary.pendingReservations ?? 0}</span>
              <span className="dash-kpi-label">未確定の予約</span>
            </span>
          </Link>
          <Link href="/" className="dash-kpi dash-kpi-alert">
            <span className="dash-kpi-icon">🚨</span>
            <span className="dash-kpi-figures">
              <span className="dash-kpi-value">{summary.pendingShakenReminders}</span>
              <span className="dash-kpi-label">車検リマインド対象</span>
            </span>
          </Link>
        </div>
      )}

      <div className="statgrid">
        <Link href="/ocr" className="statcard block">
          <div className="num">📷</div>
          <div className="lbl">車検証OCR</div>
          <div className="statcard-desc">車検証を撮影してAIで自動入力</div>
        </Link>

        <Link href="/reservations" className="statcard block">
          <div className="num">📅</div>
          <div className="lbl">予約管理</div>
          <div className="statcard-desc">カレンダーで予約を確認・調整</div>
        </Link>

        <Link href="/ai-chat" className="statcard block">
          <div className="num">🤖</div>
          <div className="lbl">AIチャット</div>
          <div className="statcard-desc">整備のご相談をAIにすぐ質問</div>
        </Link>
      </div>

      {unreadLine.length > 0 && (
        <div className="line-notify-list">
          {unreadLine.map((u) => (
            <Link
              key={u.customerId}
              href={`/customers/${u.customerId}/line`}
              className={`line-notify ${u.hasImage ? 'has-image' : ''}`}
            >
              <span className="line-notify-icon" aria-hidden>
                {u.hasImage ? '🖼️' : '💬'}
              </span>
              <span className="line-notify-body">
                <span className="line-notify-name">{u.customerName} 様からLINE</span>
                <span className="line-notify-text">{u.latestText}</span>
              </span>
              {u.count > 1 && <span className="line-notify-count">{u.count}</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="dash-grid">
        {shakenReminders.length > 0 && (
          <DashboardPanel icon="🚗" title="そろそろ車検のお客様" count={shakenReminders.length} defaultOpen>
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
          </DashboardPanel>
        )}

        <DashboardPanel
          icon="📅"
          title="直近の予約"
          count={upcomingReservations.length}
          linkHref="/reservations"
          defaultOpen={shakenReminders.length === 0}
        >
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
        </DashboardPanel>

        <DashboardPanel
          icon="🕒"
          title="最近登録した顧客"
          count={recentCustomers.length}
          linkHref="/customers"
        >
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
        </DashboardPanel>
      </div>
    </div>
  );
}
