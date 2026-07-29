// frontend/app/portal/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { initLiff, isLoggedIn, loginWithLiff, getIdToken } from '@/lib/portal-liff';
import { formatFlexibleDate } from '@/lib/japaneseDate';

type Vehicle = {
  id: number;
  carName: string | null;
  commonModelName: string | null;
  registrationNumber: string | null;
  expirationDate: string | null;
};

type Me = {
  customerName: string;
  portalPaid: boolean;
  companyAccountId: number;
  companyName: string;
  vehicles: Vehicle[];
};

type CompanyOption = { companyAccountId: number; displayName: string; portalPaid?: boolean };

type Status = 'loading' | 'ready' | 'not-linked' | 'error';

export default function PortalHomePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switching, setSwitching] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    // 既に有効なポータルセッションがあれば、LIFFの再認証をせずそのまま使う
    try {
      const existing = await api<Me>('/portal/me');
      setMe(existing);
      await loadCompanies();
      setStatus('ready');
      return;
    } catch {
      // 未ログイン、LIFF認証へ進む
    }

    try {
      await initLiff();
    } catch {
      setStatus('error');
      return;
    }

    if (!isLoggedIn()) {
      loginWithLiff();
      return;
    }

    const idToken = getIdToken();

    if (!idToken) {
      setStatus('error');
      return;
    }

    try {
      const result = await api<{ linked: boolean; companies?: CompanyOption[] }>(
        '/portal/auth/login',
        { method: 'POST', body: JSON.stringify({ idToken }) },
      );

      if (!result.linked) {
        setStatus('not-linked');
        return;
      }

      await loadCompanies();

      const json = await api<Me>('/portal/me');
      setMe(json);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function loadCompanies() {
    try {
      const list = await api<CompanyOption[]>('/portal/auth/companies-status');
      setCompanies(list);
    } catch {}
  }

  async function switchCompany(companyAccountId: number) {
    setSwitching(true);

    try {
      await api('/portal/auth/switch-company', {
        method: 'POST',
        body: JSON.stringify({ companyAccountId }),
      });

      const json = await api<Me>('/portal/me');
      setMe(json);
      await loadCompanies();
      setSwitcherOpen(false);
    } finally {
      setSwitching(false);
    }
  }

  const currentCompanyName = me?.companyName ?? null;

  if (status === 'loading') {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  if (status === 'error') {
    return (
      <div className="portal-body">
        <div className="panel">
          <div className="empty">
            読み込みに失敗しました。時間をおいて、もう一度LINEのメニューから開き直してください。
          </div>
        </div>
      </div>
    );
  }

  if (status === 'not-linked') {
    return (
      <div className="portal-body">
        <div className="panel">
          <h1 className="disp text-xl mb-3">ガレージ・カルテ ポータル</h1>
          <div className="empty">
            まだ店舗との連携が完了していません。お店で発行された連携コード(QRコード)を、公式LINEのトーク画面で読み取ってください。
          </div>
        </div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <>
      <div className="portal-topbar">
        <div className="portal-topbar-logo">🔧</div>
        <div className="portal-topbar-title">
          ガレージ・<span>カルテ</span>
        </div>

        {companies.length > 1 && (
          <div
            className="portal-company-chip tappable"
            onClick={() => setSwitcherOpen((v) => !v)}
          >
            <span className="name">🏢 {currentCompanyName}</span>
            <span>▾</span>
          </div>
        )}
        {companies.length === 1 && (
          <div className="portal-company-chip">
            <span className="name">🏢 {companies[0].displayName}</span>
          </div>
        )}
      </div>

      {switcherOpen && companies.length > 1 && (
        <div className="portal-switcher">
          <div className="text-xs text-white/50 px-2 pb-1">表示する店舗を選ぶ</div>
          {companies.map((c) => (
            <button
              key={c.companyAccountId}
              onClick={() => switchCompany(c.companyAccountId)}
              disabled={switching}
              className={`portal-switcher-item ${c.companyAccountId === me?.companyAccountId ? 'active' : ''}`}
            >
              <span>🏢 {c.displayName}</span>
              <span className={c.portalPaid ? 'badge-ok' : 'expbadge'}>
                {c.portalPaid ? '✅ 有料' : '無料'}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="portal-body">
        <div className="portal-hero">
          <div className="portal-hero-avatar">👤</div>
          <div>
            <div className="portal-hero-greeting">ようこそ</div>
            <div className="portal-hero-name">{me.customerName} 様</div>
          </div>
        </div>

        <div className="portal-section-title">🚗 車両情報</div>

        {me.vehicles.length === 0 ? (
          <div className="empty">登録された車両はありません。</div>
        ) : (
          me.vehicles.map((v) => (
            <div key={v.id} className="portal-vehicle-card">
              <div className="font-semibold">
                {v.carName || '-'}
                {v.commonModelName && (
                  <span className="ml-2 text-[var(--blue)]">{v.commonModelName}</span>
                )}
              </div>
              <div className="text-sm text-[var(--muted)]">{v.registrationNumber}</div>
              <div className="mt-1 text-sm">
                車検満了日：<span className="font-semibold">{formatFlexibleDate(v.expirationDate) || '-'}</span>
              </div>
            </div>
          ))
        )}

        {me.portalPaid ? (
          <>
            <div className="portal-section-title">🔧 整備データ({currentCompanyName ?? 'この店舗'})</div>
            <div className="portal-quickgrid">
              <Link href="/portal/service-history" className="portal-quick-btn">
                <span className="portal-quick-icon">🧾</span>
                整備履歴・金額
              </Link>
              <Link href="/portal/maintenance" className="portal-quick-btn">
                <span className="portal-quick-icon">🔧</span>
                次回整備のおすすめ
              </Link>
              <Link href="/portal/tire-wear" className="portal-quick-btn">
                <span className="portal-quick-icon">🛞</span>
                タイヤ交換時期
              </Link>
            </div>
          </>
        ) : (
          <div className="portal-upsell">
            <h2 className="disp text-base mb-2">整備データ(有料プラン)</h2>
            <p className="text-xs">
              整備履歴の金額明細、次回整備のおすすめ、タイヤの推定交換時期は有料プランでご利用いただけます。詳しくは店舗までお問い合わせください。
            </p>
          </div>
        )}

        <div className="portal-section-title">📷 他店舗見積</div>
        <Link href="/portal/competitor-estimates" className="portal-vehicle-card block">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold">他店舗見積を保存・比較</div>
              <div className="text-xs text-[var(--muted)] mt-1">撮影するだけでAIが自動で読み取ります</div>
            </div>
            <span className="text-[var(--muted)]">›</span>
          </div>
        </Link>
      </div>
    </>
  );
}
