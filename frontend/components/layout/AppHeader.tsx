// frontend/components/layout/AppHeader.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCompany } from '@/hooks/useCompany';

const TABS = [
  { href: '/', icon: '🏠', label: 'ホーム' },
  { href: '/customers', icon: '👥', label: '顧客一覧' },
  { href: '/vehicle', icon: '🚗', label: '車両管理' },
  { href: '/reservations', icon: '📅', label: '予約管理' },
  { href: '/estimates/new', icon: '📝', label: '見積作成' },
  { href: '/ocr', icon: '📷', label: '車検証OCR' },
  { href: '/competitor-estimates', icon: '📊', label: '他店比較' },
  { href: '/settings', icon: '⚙️', label: '設定' },
];

type Summary = {
  customers: number;
  vehicles: number;
  unreadLineMessages: number;
  pendingOcrSubmissions: number;
  pendingReservations: number | null;
  pendingShakenReminders: number;
};

const UNREAD_POLL_INTERVAL_MS = 30000;

function NotificationBadge({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        background: 'var(--danger)',
        color: '#fff',
        borderRadius: 999,
        padding: '2px 10px',
        fontWeight: 700,
      }}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const { company } = useCompany();

  const [summary, setSummary] = useState<Summary>({
    customers: 0,
    vehicles: 0,
    unreadLineMessages: 0,
    pendingOcrSubmissions: 0,
    pendingReservations: null,
    pendingShakenReminders: 0,
  });

  useEffect(() => {
    function load() {
      api<{ summary: Summary }>('')
        .then((data) => setSummary(data.summary))
        .catch(() => {});
    }

    load();

    const interval = setInterval(load, UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const usedOcr = company?.license?.usedOcr ?? 0;
  const maxOcr = company?.license?.maxOcrPerMonth ?? 0;
  const ocrLabel = maxOcr === -1 ? '∞' : `${usedOcr}/${maxOcr}`;

  return (
    <header className="gk-header">
      <div className="gk-headrow">
        <div className="gk-logo">🔧</div>

        <div>
          <div className="gk-apptitle">
            <span className="gk-apptitle-accent">ガレージ</span>・カルテ
          </div>
          <div className="gk-subtitle">整備工場向け顧客・車両管理</div>
        </div>

        <div className="gk-stats">
          {summary.unreadLineMessages > 0 && (
            <NotificationBadge href="/customers">
              🔔 新着LINE {summary.unreadLineMessages}
            </NotificationBadge>
          )}
          {!!summary.pendingReservations && summary.pendingReservations > 0 && (
            <NotificationBadge href="/reservations">
              📅 新規LINE予約 {summary.pendingReservations}
            </NotificationBadge>
          )}
          {summary.pendingOcrSubmissions > 0 && (
            <NotificationBadge href="/ocr/line-submissions">
              📷 車検証OCR未確認 {summary.pendingOcrSubmissions}
            </NotificationBadge>
          )}
          {summary.pendingShakenReminders > 0 && (
            <NotificationBadge href="/">
              🚗 車検リマインド {summary.pendingShakenReminders}
            </NotificationBadge>
          )}
          <span>👥 {summary.customers}</span>
          <span>🚗 {summary.vehicles}</span>
          <span>📷 {ocrLabel}</span>
        </div>
      </div>

      <nav className="gk-tabs">
        {TABS.map((tab) => {
          const active =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`gk-tab-btn ${active ? 'active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
