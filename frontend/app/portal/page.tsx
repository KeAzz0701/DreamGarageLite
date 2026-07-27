// frontend/app/portal/page.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { initLiff, isLoggedIn, loginWithLiff, getIdToken } from '@/lib/portal-liff';

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
  vehicles: Vehicle[];
};

type CompanyOption = { companyAccountId: number; displayName: string; portalPaid?: boolean };

type Status = 'loading' | 'ready' | 'not-linked' | 'error';

export default function PortalHomePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [switching, setSwitching] = useState(false);

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
    } finally {
      setSwitching(false);
    }
  }

  if (status === 'loading') {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  if (status === 'error') {
    return (
      <div className="panel">
        <div className="empty">
          読み込みに失敗しました。時間をおいて、もう一度LINEのメニューから開き直してください。
        </div>
      </div>
    );
  }

  if (status === 'not-linked') {
    return (
      <div className="panel">
        <h1 className="disp text-xl mb-3">ガレージ・カルテ ポータル</h1>
        <div className="empty">
          まだ店舗との連携が完了していません。お店で発行された連携コード(QRコード)を、公式LINEのトーク画面で読み取ってください。
        </div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <>
      <h1 className="disp text-2xl mb-4">ガレージ・カルテ ポータル</h1>

      {companies.length > 1 && (
        <div className="panel mb-4">
          <div className="text-xs text-[var(--muted)] mb-2">連携中の店舗</div>
          <div className="flex flex-col gap-2">
            {companies.map((c) => (
              <button
                key={c.companyAccountId}
                onClick={() => switchCompany(c.companyAccountId)}
                disabled={switching}
                className="btn btn-ghost btn-sm flex justify-between items-center"
              >
                <span>🏢 {c.displayName}</span>
                <span className={c.portalPaid ? 'badge-ok' : 'expbadge'}>
                  {c.portalPaid ? '✅ 有料' : '無料'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel mb-4">
        <div className="text-xs text-[var(--muted)]">お客様名</div>
        <div className="cname disp text-xl">{me.customerName}</div>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-lg mb-3">車両情報</h2>

        {me.vehicles.length === 0 ? (
          <div className="empty">登録された車両はありません。</div>
        ) : (
          me.vehicles.map((v) => (
            <div key={v.id} className="veh mb-2">
              <div className="font-semibold">
                {v.carName || '-'}
                {v.commonModelName && (
                  <span className="ml-2 text-[var(--blue)]">{v.commonModelName}</span>
                )}
              </div>
              <div>{v.registrationNumber}</div>
              <div className="mt-1 text-sm">
                車検満了日：<span className="font-semibold">{v.expirationDate || '-'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-lg mb-3">他店舗見積の保存・比較</h2>
        <Link href="/portal/competitor-estimates" className="btn btn-blue">
          📷 他店舗見積を保存する
        </Link>
      </div>

      {me.portalPaid ? (
        <div className="panel">
          <h2 className="disp text-lg mb-3">整備データ</h2>
          <div className="flex flex-col gap-2">
            <Link href="/portal/service-history" className="btn btn-blue">
              🧾 整備履歴・金額を見る
            </Link>
            <Link href="/portal/maintenance" className="btn btn-blue">
              🔧 次回整備のおすすめを見る
            </Link>
            <Link href="/portal/tire-wear" className="btn btn-blue">
              🛞 タイヤの推定交換時期を見る
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel">
          <h2 className="disp text-lg mb-2">整備データ(有料プラン)</h2>
          <p className="note">
            整備履歴の金額明細、次回整備のおすすめ、タイヤの推定交換時期は有料プランでご利用いただけます。詳しくは店舗までお問い合わせください。
          </p>
        </div>
      )}
    </>
  );
}
