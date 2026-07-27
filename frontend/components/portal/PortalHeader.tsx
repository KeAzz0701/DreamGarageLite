// frontend/components/portal/PortalHeader.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type CompanyOption = { companyAccountId: number; displayName: string; portalPaid?: boolean };

export default function PortalHeader({ title }: { title: string }) {
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);
  const [currentCompanyName, setCurrentCompanyName] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    boot();
  }, []);

  async function boot() {
    // me() が失敗しても(例: この店舗では未課金でservice-history等が403等になった直後の
    // 再読み込みなど)、店舗切り替えチップ自体は消さずに出し続けたいため、
    // どちらか一方の失敗がもう片方の表示を巻き込んで消さないよう個別に取得する
    const [meResult, listResult] = await Promise.allSettled([
      api<{ companyAccountId: number; companyName: string }>('/portal/me'),
      api<CompanyOption[]>('/portal/auth/companies-status'),
    ]);

    if (meResult.status === 'fulfilled') {
      setCurrentCompanyId(meResult.value.companyAccountId);
      setCurrentCompanyName(meResult.value.companyName);
    }

    if (listResult.status === 'fulfilled') {
      setCompanies(listResult.value);
    }
  }

  async function switchCompany(companyAccountId: number) {
    setSwitching(true);

    try {
      await api('/portal/auth/switch-company', {
        method: 'POST',
        body: JSON.stringify({ companyAccountId }),
      });

      // 会社をまたいでデータを取り出す画面(整備履歴・タイヤ交換時期など)は
      // 個々に再取得ロジックを持たせるより、画面ごと読み込み直す方が確実
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      <div className="portal-subheader">
        <h1 className="disp">{title}</h1>

        {companies.length > 1 && (
          <div
            className="portal-company-chip tappable"
            onClick={() => setSwitcherOpen((v) => !v)}
          >
            <span className="name">🏢 {currentCompanyName}</span>
            <span>▾</span>
          </div>
        )}

        <Link href="/portal" className="btn btn-ghost btn-sm">
          戻る
        </Link>
      </div>

      {switcherOpen && companies.length > 1 && (
        <div className="portal-switcher">
          <div className="text-xs text-white/50 px-2 pb-1">表示する店舗を選ぶ</div>
          {companies.map((c) => (
            <button
              key={c.companyAccountId}
              onClick={() => switchCompany(c.companyAccountId)}
              disabled={switching}
              className={`portal-switcher-item ${c.companyAccountId === currentCompanyId ? 'active' : ''}`}
            >
              <span>🏢 {c.displayName}</span>
              <span className={c.portalPaid ? 'badge-ok' : 'expbadge'}>
                {c.portalPaid ? '✅ 有料' : '無料'}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
