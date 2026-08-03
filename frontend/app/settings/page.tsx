// frontend/app/settings/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiBaseUrl, extractErrorMessage } from '@/lib/api';
import GoogleCalendarIntegrationCard from '@/components/settings/GoogleCalendarIntegrationCard';

const LINE_BASIC_ID = process.env.NEXT_PUBLIC_LINE_BASIC_ID;

const PLAN_ORDER = ['FREE', 'LITE', 'STANDARD', 'PRO'];

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
  const [feeRates, setFeeRates] = useState<any[]>([]);
  const [newFeeRateDraft, setNewFeeRateDraft] = useState<
    Record<string, { name: string; price: string; isLaborItem: boolean }>
  >({});
  const [openFeeCategories, setOpenFeeCategories] = useState<Set<string>>(new Set());
  const [staffJoinCode, setStaffJoinCode] = useState('');
  const [staffLinks, setStaffLinks] = useState<
    { id: number; displayName: string | null; joinedAt: string; staffAccessCode: string | null }[]
  >([]);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // 社員のLINE入室セッションかどうかで、会社情報・振込先・料金プラン・
    // 社員用LINE連携の各パネルを表示するかを決める(バックエンドも同様に書き込みを制限している)
    const me = await api<any>('/auth/me');
    const staffSession = !!me.staffDisplayName;
    setIsStaff(staffSession);

    const companyJson = await api<any>('/company');

    setCompany(companyJson);

    if (!companyJson) return;

    const settingsJson = await api<any>(
      `/settings/${companyJson.id}`,
    );

    setSettings(settingsJson);

    const rates = await api<any[]>('/fee-rates');
    setFeeRates(rates);

    if (staffSession) return;

    if (companyJson.license?.licenseKey) {
      const licenseJson = await api<any>(
        `/license/${companyJson.license.licenseKey}`,
      );

      setLicense(licenseJson);
    }

    const planJson = await api<any>(
      `/license/company/${companyJson.id}/plans`,
    );

    setPlanInfo(planJson);

    const requests = await api<any[]>(
      `/license/company/${companyJson.id}/plan-change-requests`,
    );

    setPlanRequests(requests);

    const staffLineInfo = await api<{ joinCode: string }>('/company/staff-line-info');
    setStaffJoinCode(staffLineInfo.joinCode);

    const staffLinkList = await api<
      { id: number; displayName: string | null; joinedAt: string; staffAccessCode: string | null }[]
    >('/company/staff-line-links');
    setStaffLinks(staffLinkList);
  }

  function goToPaymentScreen(plan: string) {
    if (plan === 'FREE') {
      switchToFree();
      return;
    }

    router.push(`/settings/payment?plan=${plan}`);
  }

  async function switchToFree() {
    if (!window.confirm('無料プランに切り替えますか？')) return;

    try {
      await api(`/license/company/${company.id}/plans`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: 'FREE' }),
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
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

  async function save() {
    await api(`/settings/${company.id}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });

    alert('保存しました');
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  async function removeStaffLink(id: number) {
    if (
      !window.confirm(
        'このスタッフの連携を解除しますか？毎朝の通知が届かなくなるほか、この入室IDでのガレージ・カルテへのログインもできなくなります。',
      )
    )
      return;

    try {
      await api(`/company/staff-line-links/${id}`, { method: 'DELETE' });
      setStaffLinks((links) => links.filter((l) => l.id !== id));
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function regenerateStaffAccessCode(id: number) {
    if (!window.confirm('入室IDを再発行しますか？今まで使っていた入室IDは使えなくなります。')) return;

    try {
      const { staffAccessCode } = await api<{ staffAccessCode: string | null }>(
        `/company/staff-line-links/${id}/regenerate-code`,
        { method: 'POST' },
      );
      setStaffLinks((links) =>
        links.map((l) => (l.id === id ? { ...l, staffAccessCode } : l)),
      );
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
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
    await api(`/fee-rates/${rate.id}`, {
      method: 'PUT',
      body: JSON.stringify({ price: rate.price }),
    });
  }

  async function toggleFeeRateLaborItem(id: number) {
    const rate = feeRates.find((r) => r.id === id);
    if (!rate) return;

    const isLaborItem = !rate.isLaborItem;
    setFeeRates((rates) => rates.map((r) => (r.id === id ? { ...r, isLaborItem } : r)));

    try {
      await api(`/fee-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isLaborItem }),
      });
    } catch (e: any) {
      alert(extractErrorMessage(e));
      load();
    }
  }

  function toggleFeeCategoryOpen(category: string) {
    setOpenFeeCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function renameFeeRateDraft(id: number, itemName: string) {
    setFeeRates((rates) => rates.map((r) => (r.id === id ? { ...r, itemName } : r)));
  }

  async function submitFeeRateName(id: number) {
    const rate = feeRates.find((r) => r.id === id);
    if (!rate) return;

    try {
      await api(`/fee-rates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ itemName: rate.itemName }),
      });
    } catch (e: any) {
      alert(extractErrorMessage(e));
      load();
    }
  }

  async function removeFeeRateItem(id: number) {
    if (!window.confirm('この項目を削除しますか？')) return;

    try {
      await api(`/fee-rates/${id}`, { method: 'DELETE' });
      setFeeRates((rates) => rates.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function addFeeRateItem(category: string) {
    const draft = newFeeRateDraft[category];
    const name = draft?.name?.trim();

    if (!name) return;

    try {
      const created = await api<any>('/fee-rates', {
        method: 'POST',
        body: JSON.stringify({
          vehicleCategory: category,
          itemName: name,
          price: Number(draft?.price) || 0,
          isLaborItem: Boolean(draft?.isLaborItem),
        }),
      });
      setFeeRates((rates) => [...rates, created]);
      setNewFeeRateDraft((d) => ({ ...d, [category]: { name: '', price: '', isLaborItem: false } }));
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function moveFeeRateItem(category: string, id: number, direction: -1 | 1) {
    const rows = feeRates
      .filter((r) => r.vehicleCategory === category)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = rows.findIndex((r) => r.id === id);
    const swapIdx = idx + direction;

    if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;

    const reordered = [...rows];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const orderedIds = reordered.map((r) => r.id);

    setFeeRates((rates) =>
      rates.map((r) => {
        const newIndex = orderedIds.indexOf(r.id);
        return newIndex >= 0 ? { ...r, sortOrder: newIndex } : r;
      }),
    );

    try {
      await api('/fee-rates/reorder', {
        method: 'POST',
        body: JSON.stringify({ vehicleCategory: category, orderedIds }),
      });
    } catch (e: any) {
      alert(extractErrorMessage(e));
      load();
    }
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

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">お知らせ</h2>
        <p className="note mb-3">
          お客様のLINEに配信するお知らせ・キャンペーン情報を投稿・編集できます。
        </p>
        <Link href="/announcements" className="btn btn-primary">
          📢 お知らせを管理する
        </Link>
      </div>

      {!isStaff && (
        <div className="panel mb-4">
          <h2 className="disp text-xl mb-3">社員用LINE連携・ログイン</h2>
          <p className="note mb-3">
            このQRコードを社員のLINEで読み取っていただくと、毎朝6時ごろに本日のご予約と、車検満了日が2ヶ月以内のお客様一覧(お名前・車両名・電話番号・住所)が届くほか、会社パスワードを教えなくても「入室ID」でガレージ・カルテにログインできるようになります。
            お客様用の連携コードとは別枠なので、お客様には表示しないでください。連携を解除すると、その社員はログインもできなくなります。
          </p>

          {staffJoinCode && (
            <div className="flex flex-wrap items-start gap-6">
              {LINE_BASIC_ID ? (
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `https://line.me/R/oaMessage/${LINE_BASIC_ID}/?${encodeURIComponent('GKSTAFF-' + staffJoinCode)}`,
                    )}`}
                    alt="社員用LINE参加QRコード"
                    className="mx-auto"
                    style={{ width: 180, height: 180 }}
                  />
                  <div className="mono mt-2 text-sm">GKSTAFF-{staffJoinCode}</div>
                  <a
                    href={`https://line.me/R/oaMessage/${LINE_BASIC_ID}/?${encodeURIComponent('GKSTAFF-' + staffJoinCode)}`}
                    className="btn btn-primary btn-sm mt-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 このスマホの公式LINEを開く
                  </a>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    タップすると公式LINEのトーク画面が開き、参加コードが入力欄に自動で入ります。送信ボタンを押すだけで連携完了です。
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  参加コード：<span className="mono font-bold">GKSTAFF-{staffJoinCode}</span>
                </div>
              )}

              <div className="flex-1 min-w-[220px]">
                <div className="kicker mono text-xs text-[var(--muted)] mb-2">
                  登録済みスタッフ（{staffLinks.length}名）
                </div>

                {staffLinks.length === 0 ? (
                  <div className="empty">まだ誰も登録していません。</div>
                ) : (
                  staffLinks.map((s) => (
                    <div key={s.id} className="minirow">
                      <span className="l">
                        {s.displayName ?? '(表示名未取得)'}
                        {s.staffAccessCode && (
                          <span className="mono text-xs text-[var(--muted)] ml-2">
                            入室ID: {s.staffAccessCode}
                          </span>
                        )}
                      </span>
                      <span className="r flex items-center gap-2">
                        <span className="mono text-xs text-[var(--muted)]">
                          {new Date(s.joinedAt).toLocaleDateString('ja-JP')}
                        </span>
                        <button
                          onClick={() => regenerateStaffAccessCode(s.id)}
                          className="btn-icon"
                          title="入室IDを再発行"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => removeStaffLink(s.id)}
                          className="btn-icon"
                          title="登録解除"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <GoogleCalendarIntegrationCard />

      {!isStaff && (
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
      )}

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

          const rows = feeRates
            .filter((r) => r.vehicleCategory === category)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const draft = newFeeRateDraft[category] ?? { name: '', price: '', isLaborItem: false };
          const categoryOpen = openFeeCategories.has(category);

          return (
            <div key={category} className="feerate-category mb-2">
              <div
                className="feerate-category-head"
                onClick={() => toggleFeeCategoryOpen(category)}
              >
                <span className="feerate-category-title">
                  {CATEGORY_LABELS[category]}
                  <span className="feerate-count">{rows.length}</span>
                </span>
                <span className={`feerate-chevron ${categoryOpen ? 'is-open' : ''}`} aria-hidden>
                  ▾
                </span>
              </div>

              {categoryOpen && (
                <div className="feerate-category-body">
                  {rows.length === 0 && (
                    <div className="text-xs text-[var(--muted)] mb-2">項目がありません。</div>
                  )}

                  {rows.map((rate, i) => (
                    <div key={rate.id} className="minirow">
                      <span className="l flex items-center gap-1">
                        <span className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => moveFeeRateItem(category, rate.id, -1)}
                            disabled={i === 0}
                            className="btn-icon"
                            style={{ padding: 0, lineHeight: 1, opacity: i === 0 ? 0.3 : 1 }}
                            title="上に移動"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFeeRateItem(category, rate.id, 1)}
                            disabled={i === rows.length - 1}
                            className="btn-icon"
                            style={{ padding: 0, lineHeight: 1, opacity: i === rows.length - 1 ? 0.3 : 1 }}
                            title="下に移動"
                          >
                            ▼
                          </button>
                        </span>
                        <input
                          className="input"
                          value={rate.itemName}
                          onChange={(e) => renameFeeRateDraft(rate.id, e.target.value)}
                          onBlur={() => submitFeeRateName(rate.id)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleFeeRateLaborItem(rate.id)}
                          className={`feerate-type-toggle ${rate.isLaborItem ? 'labor' : 'parts'}`}
                          title="部品代／技術料の区分を切り替え"
                        >
                          {rate.isLaborItem ? '🔧 技術料' : '🔩 部品代'}
                        </button>
                      </span>
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
                        <button
                          type="button"
                          onClick={() => removeFeeRateItem(rate.id)}
                          className="btn-icon"
                          title="この項目を削除"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))}

                  <div className="minirow">
                    <span className="l flex items-center gap-1">
                      <input
                        className="input"
                        placeholder="新しい項目名"
                        value={draft.name}
                        onChange={(e) =>
                          setNewFeeRateDraft((d) => ({ ...d, [category]: { ...draft, name: e.target.value } }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewFeeRateDraft((d) => ({
                            ...d,
                            [category]: { ...draft, isLaborItem: !draft.isLaborItem },
                          }))
                        }
                        className={`feerate-type-toggle ${draft.isLaborItem ? 'labor' : 'parts'}`}
                        title="部品代／技術料の区分を切り替え"
                      >
                        {draft.isLaborItem ? '🔧 技術料' : '🔩 部品代'}
                      </button>
                    </span>
                    <span className="r flex items-center gap-2">
                      <input
                        type="number"
                        step="100"
                        className="input"
                        style={{ width: 100 }}
                        placeholder="0"
                        value={draft.price}
                        onChange={(e) =>
                          setNewFeeRateDraft((d) => ({ ...d, [category]: { ...draft, price: e.target.value } }))
                        }
                      />
                      円
                      <button
                        type="button"
                        onClick={() => addFeeRateItem(category)}
                        className="btn btn-ghost btn-sm"
                      >
                        ＋追加
                      </button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isStaff && (
      <div className="panel space-y-5 mb-4">
        <h2 className="disp text-xl">振込先情報（納品書・請求書に印刷されます）</h2>

        <div className="grid2">
          <label className="field-label">
            金融機関名
            <input
              className="input"
              placeholder="例: 楽天銀行"
              value={settings.bankName ?? ''}
              onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
            />
          </label>

          <label className="field-label">
            支店名
            <input
              className="input"
              placeholder="例: 229"
              value={settings.bankBranchName ?? ''}
              onChange={(e) => setSettings({ ...settings, bankBranchName: e.target.value })}
            />
          </label>

          <label className="field-label">
            口座種別
            <select
              className="input"
              value={settings.bankAccountType ?? '普通'}
              onChange={(e) => setSettings({ ...settings, bankAccountType: e.target.value })}
            >
              <option value="普通">普通</option>
              <option value="当座">当座</option>
            </select>
          </label>

          <label className="field-label">
            口座番号
            <input
              className="input"
              placeholder="例: 2002958"
              value={settings.bankAccountNumber ?? ''}
              onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
            />
          </label>

          <label className="field-label">
            口座名義
            <input
              className="input"
              placeholder="例: カ）ドリームガレージ"
              value={settings.bankAccountHolder ?? ''}
              onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })}
            />
          </label>
        </div>

        <button onClick={save} className="btn btn-primary">
          振込先を保存
        </button>
      </div>
      )}

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
          工賃(1時間あたり)
          <input
            className="input"
            type="number"
            step="100"
            placeholder="例: 7500"
            value={settings.laborRatePerHour ?? ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                laborRatePerHour: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </label>

        <button onClick={save} className="btn btn-primary">
          保存
        </button>
      </div>

      <div className="panel space-y-5">
        <h2 className="disp text-xl">緊急時のご案内(顧客LINE)</h2>
        <p className="note">
          お客様がLINEで「故障」「事故」「動かない」等のメッセージを送ると、AIの応答より先にこちらの連絡先を自動でご案内します。
          営業時間内は会社情報の電話番号を、営業時間外は下記の緊急連絡先(未設定ならJAF等ロードサービスの案内のみ)を返信します。
        </p>

        <label className="field-label">
          営業時間外の緊急連絡先(任意)
          <input
            className="input"
            placeholder="例: 090-0000-0000(担当者の携帯番号など)"
            value={settings.emergencyContactPhone ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, emergencyContactPhone: e.target.value })
            }
          />
        </label>

        <button onClick={save} className="btn btn-primary">
          保存
        </button>
      </div>

      <div className="panel space-y-5 mb-4">
        <h2 className="disp text-xl">整備リマインド設定</h2>
        <p className="note">
          整備履歴に「オイル交換」「タイヤ交換」として記録した内容をもとに、次回の目安が近づいたお客様をLINEでご案内します。
          月数・距離のどちらか片方だけでも、両方でも設定できます(早い方を目安にします)。空欄のままにするとその項目のリマインドは行いません。
        </p>

        <div className="grid2">
          <label className="field-label">
            オイル交換の目安(ヶ月)
            <input
              className="input"
              type="number"
              placeholder="例: 6"
              value={settings.oilChangeIntervalMonths ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  oilChangeIntervalMonths: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>

          <label className="field-label">
            オイル交換の目安(km)
            <input
              className="input"
              type="number"
              step="100"
              placeholder="例: 5000"
              value={settings.oilChangeIntervalKm ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  oilChangeIntervalKm: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>

          <label className="field-label">
            タイヤ交換の目安(ヶ月)
            <input
              className="input"
              type="number"
              placeholder="例: 48"
              value={settings.tireChangeIntervalMonths ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tireChangeIntervalMonths: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>

          <label className="field-label">
            タイヤ交換の目安(km)
            <input
              className="input"
              type="number"
              step="100"
              placeholder="例: 30000"
              value={settings.tireChangeIntervalKm ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tireChangeIntervalKm: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <button onClick={save} className="btn btn-primary">
          保存
        </button>
      </div>

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
                      <div
                        className="font-bold"
                        style={{
                          letterSpacing: '0.08em',
                          fontFamily: 'var(--font-mono, monospace)',
                          color: 'var(--blue)',
                        }}
                      >
                        {plan.label}
                      </div>
                      <div className="mono text-lg">
                        ¥{plan.priceYen.toLocaleString()}
                        <span className="text-xs text-[var(--muted)]">/月</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrent && <span className="expbadge exp-ok">利用中</span>}
                      {isCurrent && planInfo.current?.trialDaysRemaining != null && (
                        <button
                          onClick={() =>
                            alert(
                              `無料お試し期間中です。あと${planInfo.current.trialDaysRemaining}日で、一部の機能(タイヤ/オイル予測通知・LINE AIチャット・Web予約など)が使えなくなります。`,
                            )
                          }
                          className="expbadge exp-warn"
                        >
                          ⚠️ まもなく使えなくなります
                        </button>
                      )}
                    </div>
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
                <span className="r">
                  <span className="expbadge">申請中(運営側の確認をお待ちください)</span>
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="flex justify-end mt-4 mb-8">
        <button onClick={logout} className="btn btn-blue">
          🚪 ログアウト
        </button>
      </div>
    </>
  );
}