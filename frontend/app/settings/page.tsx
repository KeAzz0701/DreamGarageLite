// frontend/app/settings/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiBaseUrl } from '@/lib/api';
import GoogleCalendarIntegrationCard from '@/components/settings/GoogleCalendarIntegrationCard';

const PLAN_ORDER = ['FREE', 'LITE', 'STANDARD', 'ENTERPRISE'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: '現金',
  BANK_TRANSFER: '振込',
  CARD: 'カード',
  E_MONEY: '電子決済',
  CARRIER_BILLING: 'スマホ料金支払い',
};

export default function SettingsPage() {
  const router = useRouter();

  const [company, setCompany] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [planRequests, setPlanRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);
  const [feeRates, setFeeRates] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const companyJson = await api<any>('/company');

    setCompany(companyJson);

    if (!companyJson) return;

    const licenseJson = await api<any>(
      `/license/${companyJson.license.licenseKey}`,
    );

    setLicense(licenseJson);

    const settingsJson = await api<any>(
      `/settings/${companyJson.id}`,
    );

    setSettings(settingsJson);

    const planJson = await api<any>(
      `/license/company/${companyJson.id}/plans`,
    );

    setPlanInfo(planJson);

    const requests = await api<any[]>(
      `/license/company/${companyJson.id}/plan-change-requests`,
    );

    setPlanRequests(requests);

    const rates = await api<any[]>('/fee-rates');
    setFeeRates(rates);
  }

  function goToPaymentScreen(plan: string) {
    router.push(`/settings/payment?plan=${plan}`);
  }

  async function switchToDemo() {
    try {
      await api(`/license/company/${company.id}/plans`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: 'DEMO' }),
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function approveRequest(id: number) {
    setProcessingRequest(id);

    try {
      await api(`/license/plan-change-requests/${id}/approve`, {
        method: 'POST',
      });
      await load();
    } finally {
      setProcessingRequest(null);
    }
  }

  async function rejectRequest(id: number) {
    setProcessingRequest(id);

    try {
      await api(`/license/plan-change-requests/${id}/reject`, {
        method: 'POST',
      });
      await load();
    } finally {
      setProcessingRequest(null);
    }
  }

  async function save() {
    await api(`/settings/${company.id}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });

    alert('保存しました');
  }

  async function saveCompany() {
    await api(`/company/${company.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        companyName: company.companyName,
        address: company.address,
        invoiceNumber: company.invoiceNumber,
        phone: company.phone,
      }),
    });

    alert('会社情報を保存しました');
  }

  async function saveFeeRate(id: number, price: number) {
    setFeeRates((rates) =>
      rates.map((r) => (r.id === id ? { ...r, price } : r)),
    );
  }

  async function submitFeeRate(rate: any) {
    await api('/fee-rates', {
      method: 'POST',
      body: JSON.stringify({
        vehicleCategory: rate.vehicleCategory,
        itemName: rate.itemName,
        price: rate.price,
      }),
    });
  }

  if (!company || !settings) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  return (
    <>
      <div className="flex justify-between mb-6">
        <h1 className="disp text-3xl">設定</h1>

        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">データ出力</h2>
        <p className="note mb-3">
          顧客・車両・整備履歴のデータをExcelファイルでダウンロードします。
        </p>
        <a
          href={`${apiBaseUrl()}/export/excel`}
          className="btn btn-primary"
        >
          📊 Excelでエクスポート
        </a>
      </div>

      <GoogleCalendarIntegrationCard />

      {planInfo && (
        <div className="panel mb-4">
          <h2 className="disp text-xl mb-3">料金プラン</h2>

          {planInfo.current && (
            <div className="empty mb-4 text-left">
              現在：<span className="font-bold text-[var(--ink)]">{planInfo.current.limits.label}</span>
              {' '}(¥{planInfo.current.limits.priceYen.toLocaleString()}/月)
              　OCR利用：{planInfo.current.usedOcr}/{planInfo.current.limits.maxOcrPerMonth}件
            </div>
          )}

          <div className="grid2">
            {PLAN_ORDER.map((key) => {
              const plan = planInfo.plans[key];
              const isCurrent = planInfo.current?.plan === key;

              return (
                <div key={key} className="veh">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{plan.label}</div>
                      <div className="mono text-lg">
                        ¥{plan.priceYen.toLocaleString()}
                        <span className="text-xs text-[var(--muted)]">/月</span>
                      </div>
                    </div>

                    {isCurrent && <span className="expbadge exp-ok">利用中</span>}
                  </div>

                  <div className="mt-2 text-xs text-[var(--muted)] space-y-1">
                    <div>OCR 月{plan.maxOcrPerMonth}件</div>
                    <div>顧客登録 {plan.maxCustomers ? `${plan.maxCustomers}件まで` : '無制限'}</div>
                    <div>{plan.predictiveMaintenance ? '✓' : '✕'} タイヤ/オイル予測通知</div>
                    <div>{plan.aiChat ? '✓' : '✕'} LINE AIチャット</div>
                    <div>{plan.webReservation ? '✓' : '✕'} Web予約</div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => goToPaymentScreen(key)}
                      className="btn btn-blue btn-sm mt-3 w-full justify-center"
                    >
                      このプランに切り替える
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {planInfo.plans.DEMO && (
            <div className="veh mt-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">
                    🎁 {planInfo.plans.DEMO.label}
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      （先着{planInfo.demoSlots.capacity}社限定・全機能無料）
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    残り枠：{Math.max(planInfo.demoSlots.capacity - planInfo.demoSlots.used, 0)}
                    /{planInfo.demoSlots.capacity}
                  </div>
                </div>

                {planInfo.current?.plan === 'DEMO' && (
                  <span className="expbadge exp-ok">利用中</span>
                )}
              </div>

              {planInfo.current?.plan !== 'DEMO' && (
                <button
                  onClick={switchToDemo}
                  disabled={planInfo.demoSlots.used >= planInfo.demoSlots.capacity}
                  className="btn btn-primary btn-sm mt-3"
                >
                  {planInfo.demoSlots.used >= planInfo.demoSlots.capacity
                    ? '満枠です'
                    : 'デモプレイ版に切り替える'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {planRequests.some((r) => r.status === 'PENDING') && (
        <div className="panel mb-4">
          <h2 className="disp text-xl mb-3">承認待ちのプラン変更申請</h2>

          {planRequests
            .filter((r) => r.status === 'PENDING')
            .map((r) => (
              <div key={r.id} className="minirow">
                <span className="l">
                  {r.targetPlan}プランへ変更（{PAYMENT_METHOD_LABELS[r.paymentMethod]}）
                </span>
                <span className="r flex gap-2">
                  <button
                    onClick={() => approveRequest(r.id)}
                    disabled={processingRequest === r.id}
                    className="btn btn-primary btn-sm"
                  >
                    入金確認・承認
                  </button>
                  <button
                    onClick={() => rejectRequest(r.id)}
                    disabled={processingRequest === r.id}
                    className="btn btn-ghost btn-sm"
                  >
                    却下
                  </button>
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="panel space-y-5 mb-4">
        <h2 className="disp text-xl">会社情報（見積書・請求書に使用）</h2>

        <label className="field-label">
          会社名
          <input
            className="input"
            value={company.companyName ?? ''}
            onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
          />
        </label>

        <label className="field-label">
          住所
          <input
            className="input"
            value={company.address ?? ''}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
          />
        </label>

        <div className="grid2">
          <label className="field-label">
            電話番号
            <input
              className="input"
              value={company.phone ?? ''}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
          </label>

          <label className="field-label">
            インボイス登録番号
            <input
              className="input"
              placeholder="T1234567890123"
              value={company.invoiceNumber ?? ''}
              onChange={(e) =>
                setCompany({ ...company, invoiceNumber: e.target.value })
              }
            />
          </label>
        </div>

        <button onClick={saveCompany} className="btn btn-primary">
          会社情報を保存
        </button>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">料金表（見積の自動入力に使用）</h2>
        <p className="note mb-3">
          車検見積を作成する際、車両区分ごとにここで設定した金額が自動入力されます（あとから個別に修正できます）。
        </p>

        {['KEI', 'REGULAR', 'LARGE', 'CARGO'].map((category) => {
          const CATEGORY_LABELS: Record<string, string> = {
            KEI: '軽自動車',
            REGULAR: '普通乗用',
            LARGE: '大型・特殊',
            CARGO: '貨物自動車',
          };

          const rows = feeRates.filter((r) => r.vehicleCategory === category);

          if (rows.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <div className="grouptitle text-xs font-semibold border-b border-[var(--line)] pb-1 mb-2">
                {CATEGORY_LABELS[category]}
              </div>

              {rows.map((rate) => (
                <div key={rate.id} className="minirow">
                  <span className="l">{rate.itemName}</span>
                  <span className="r flex items-center gap-2">
                    <input
                      type="number"
                      step="100"
                      className="input"
                      style={{ width: 100 }}
                      value={rate.price}
                      onChange={(e) =>
                        saveFeeRate(rate.id, Number(e.target.value))
                      }
                      onBlur={() =>
                        submitFeeRate(feeRates.find((r) => r.id === rate.id))
                      }
                    />
                    円
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="panel space-y-5">
        <h2 className="disp text-xl">見積書設定</h2>

        <label className="field-label">
          ライセンス
          <input className="input" value={license?.plan ?? ''} disabled />
        </label>

        <label className="field-label">
          見積書に記載する規約・注意書き
          <textarea
            rows={4}
            className="input"
            placeholder="例: 本見積は概算です。実際の金額は診断後に確定します。"
            value={settings.estimateTerms ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, estimateTerms: e.target.value })
            }
          />
        </label>

        <label className="field-label">
          API URL
          <input
            className="input"
            value={settings.apiUrl ?? ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                apiUrl: e.target.value,
              })
            }
          />
        </label>

        <label className="field-label">
          Gemini Endpoint
          <input
            className="input"
            value={settings.geminiEndpoint ?? ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                geminiEndpoint: e.target.value,
              })
            }
          />
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.autoUpdate}
            onChange={(e) =>
              setSettings({
                ...settings,
                autoUpdate: e.target.checked,
              })
            }
          />
          自動アップデート
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.backupEnabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                backupEnabled: e.target.checked,
              })
            }
          />
          自動バックアップ
        </label>

        <button onClick={save} className="btn btn-primary">
          保存
        </button>
      </div>
    </>
  );
}