// frontend/app/settings/payment/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const PAYMENT_METHODS = [
  { key: 'CASH', label: '💴 現金', ready: true, note: '店舗窓口でのお支払い後、反映されます。' },
  { key: 'BANK_TRANSFER', label: '🏦 振込', ready: true, note: 'お振込み確認後、反映されます。' },
  { key: 'CARD', label: '💳 カード', ready: false, note: '' },
  { key: 'E_MONEY', label: '📱 電子決済', ready: false, note: '' },
  { key: 'CARRIER_BILLING', label: '📶 スマホ料金支払い', ready: false, note: '' },
] as const;

export default function PaymentMethodPage() {
  const searchParams = useSearchParams();
  const targetPlan = searchParams.get('plan') ?? '';

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<any>('/company').then((c) => {
      setCompanyId(c.id);
      api<any>(`/settings/${c.id}`).then(setSettings);
      api<any>(`/license/company/${c.id}/plans`).then(setPlanInfo);
    });
  }, []);

  const targetPlanInfo = planInfo?.plans?.[targetPlan];

  async function submit() {
    if (!companyId || !selected) return;

    setSubmitting(true);

    try {
      await api(`/license/company/${companyId}/plan-change-requests`, {
        method: 'POST',
        body: JSON.stringify({
          targetPlan,
          paymentMethod: selected,
        }),
      });

      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="disp text-3xl">申請完了</h1>
        </div>

        <div className="panel text-center">
          <div className="badge-ok justify-center">
            ✅ 「{targetPlan}」への変更申請を受け付けました。
          </div>
          <p className="note mt-3">
            {PAYMENT_METHODS.find((m) => m.key === selected)?.note}
            <br />
            店舗にて入金確認後、プランが切り替わります。
          </p>

          {selected === 'BANK_TRANSFER' && settings?.bankName && (
            <div className="veh mt-4 text-left inline-block">
              <div className="text-xs text-[var(--muted)] mb-1">お振込み先</div>
              <div className="text-sm">
                {settings.bankName}
                {settings.bankBranchName && ` ${settings.bankBranchName}支店`}
                {settings.bankAccountType && ` ${settings.bankAccountType}`}
                {settings.bankAccountNumber && ` ${settings.bankAccountNumber}`}
              </div>
              {settings.bankAccountHolder && (
                <div className="text-sm">名義: {settings.bankAccountHolder}</div>
              )}
            </div>
          )}

          <Link href="/settings" className="btn btn-primary mt-4">
            設定に戻る
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">お支払い方法の選択</h1>

        <Link href="/settings" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-lg mb-3">ご契約内容の確認</h2>
        <div className="text-sm space-y-1.5">
          <div>
            <span className="text-[var(--muted)]">プラン: </span>
            <b>{targetPlanInfo?.label ?? targetPlan}</b>
          </div>
          <div>
            <span className="text-[var(--muted)]">料金: </span>
            <b>
              {targetPlanInfo ? `¥${targetPlanInfo.priceYen.toLocaleString()}/月(税込)` : '読み込み中...'}
            </b>
            　月額課金・期間の定めなく自動更新されます(都度の再契約は不要です)。
          </div>
          <div>
            <span className="text-[var(--muted)]">お支払い時期: </span>
            選択したお支払い方法での入金確認後に反映されます。
          </div>
          <div>
            <span className="text-[var(--muted)]">サービス提供時期: </span>
            入金確認・運営承認後、直ちにプランが切り替わり利用可能になります。
          </div>
          <div>
            <span className="text-[var(--muted)]">解約について: </span>
            いつでも解約を申し出ることができます。解約した月の料金は日割り・月割りいずれの返金も行いません。解約は翌月以降の請求から反映されます。
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="note mb-4">
          「{targetPlan}」プランへの変更をご希望のお支払い方法を選択してください。
        </p>

        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.key}
              disabled={!method.ready}
              onClick={() => setSelected(method.key)}
              className={`veh block w-full text-left ${
                selected === method.key ? 'border-2' : ''
              } ${!method.ready ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={
                selected === method.key
                  ? { borderColor: 'var(--orange)' }
                  : undefined
              }
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{method.label}</span>
                {!method.ready && (
                  <span className="expbadge exp-warn">準備中</span>
                )}
              </div>
              {!method.ready && (
                <div className="text-xs text-[var(--muted)] mt-1">
                  決済代行サービスとの契約完了後に利用可能になります
                </div>
              )}
            </button>
          ))}
        </div>

        {selected === 'BANK_TRANSFER' && settings?.bankName && (
          <div className="veh mt-4">
            <div className="text-xs text-[var(--muted)] mb-1">お振込み先</div>
            <div className="text-sm">
              {settings.bankName}
              {settings.bankBranchName && ` ${settings.bankBranchName}支店`}
              {settings.bankAccountType && ` ${settings.bankAccountType}`}
              {settings.bankAccountNumber && ` ${settings.bankAccountNumber}`}
            </div>
            {settings.bankAccountHolder && (
              <div className="text-sm">名義: {settings.bankAccountHolder}</div>
            )}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!selected || submitting}
          className="btn btn-primary w-full justify-center mt-5"
        >
          {submitting ? '申請中...' : 'この内容で申請する'}
        </button>
      </div>
    </>
  );
}
