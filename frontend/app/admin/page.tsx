// frontend/app/admin/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

interface CompanyRow {
  id: number;
  companyCode: string;
  displayName: string;
  dbName: string;
  isActive: boolean;
  currentPlan: string | null;
  lineConnected: boolean;
  trialDaysRemaining: number | null;
  createdAt: string;
}

interface PlanChangeRequestRow {
  companyAccountId: number;
  companyName: string;
  requestId: number;
  targetPlan: string;
  paymentMethod: string;
  requestedAt: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: '現金',
  BANK_TRANSFER: '振込',
  CARD: 'カード',
  E_MONEY: '電子決済',
  CARRIER_BILLING: 'スマホ料金支払い',
};

interface AdminUserRow {
  id: number;
  username: string;
  displayName: string | null;
  createdAt: string;
}

interface ApiKeyRow {
  id: number;
  provider: string;
  tier: string;
  maskedKey: string;
  assignedCompanyName: string | null;
  assignedAt: string | null;
  createdAt: string;
}

interface PortalCustomerRow {
  companyAccountId: number;
  companyName: string;
  id: number;
  customerName: string;
  portalPaid: boolean;
}

interface ErrorReportRow {
  id: number;
  companyName: string;
  pageUrl: string;
  pageLabel: string | null;
  userAgent: string | null;
  message: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);

  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKeyTier, setNewApiKeyTier] = useState<'FREE' | 'PAID'>('FREE');
  const [addingApiKey, setAddingApiKey] = useState(false);

  const [planRequests, setPlanRequests] = useState<PlanChangeRequestRow[]>([]);
  const [processingPlanRequest, setProcessingPlanRequest] = useState<number | null>(null);

  const [errorReports, setErrorReports] = useState<ErrorReportRow[]>([]);

  const [portalQuery, setPortalQuery] = useState('');
  const [portalCustomers, setPortalCustomers] = useState<PortalCustomerRow[] | null>(null);
  const [portalSearching, setPortalSearching] = useState(false);
  const [portalTogglingId, setPortalTogglingId] = useState<number | null>(null);

  useEffect(() => {
    api<{ ok: boolean; username: string | null }>('/admin/me')
      .then((me) => {
        setChecked(true);
        setMyUsername(me.username);
        load();
        loadAdminUsers();
        loadApiKeys();
        loadPlanRequests();
        loadErrorReports();
      })
      .catch(() => router.replace('/admin/login'));
  }, []);

  async function loadErrorReports() {
    try {
      const json = await api<ErrorReportRow[]>('/admin/error-reports');
      setErrorReports(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function searchPortalCustomers() {
    if (!portalQuery.trim()) return;

    setPortalSearching(true);

    try {
      const json = await api<PortalCustomerRow[]>(
        `/admin/portal-customers?q=${encodeURIComponent(portalQuery)}`,
      );
      setPortalCustomers(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setPortalSearching(false);
    }
  }

  async function togglePortalPaid(customer: PortalCustomerRow) {
    setPortalTogglingId(customer.id);

    try {
      await api(`/admin/companies/${customer.companyAccountId}/portal-customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ portalPaid: !customer.portalPaid }),
      });

      await searchPortalCustomers();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setPortalTogglingId(null);
    }
  }

  async function load() {
    try {
      const json = await api<CompanyRow[]>('/admin/companies');
      setCompanies(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function loadAdminUsers() {
    try {
      const json = await api<AdminUserRow[]>('/admin/users');
      setAdminUsers(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function createAdminUser() {
    if (!newAdminUsername.trim()) return;

    setCreatingAdmin(true);

    try {
      const result = await api<{ username: string; password: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          displayName: newAdminDisplayName.trim() || undefined,
        }),
      });

      alert(
        `担当者アカウントを作成しました。この画面を閉じると二度と表示されません。\n\nユーザー名: ${result.username}\nパスワード: ${result.password}`,
      );

      setNewAdminUsername('');
      setNewAdminDisplayName('');
      await loadAdminUsers();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function resetAdminUserPassword(user: AdminUserRow) {
    if (!window.confirm(`「${user.username}」のパスワードを再発行しますか？`)) return;

    try {
      const result = await api<{ username: string; password: string }>(
        `/admin/users/${user.id}/reset-password`,
        { method: 'POST' },
      );

      alert(`新しいパスワードです。\n\nユーザー名: ${result.username}\nパスワード: ${result.password}`);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function deleteAdminUser(user: AdminUserRow) {
    if (!window.confirm(`「${user.username}」を削除しますか？`)) return;

    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE' });
      await loadAdminUsers();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function loadApiKeys() {
    try {
      const json = await api<ApiKeyRow[]>('/admin/api-keys');
      setApiKeys(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function addApiKey() {
    if (!newApiKey.trim()) return;

    setAddingApiKey(true);

    try {
      await api('/admin/api-keys', {
        method: 'POST',
        body: JSON.stringify({ apiKey: newApiKey.trim(), tier: newApiKeyTier }),
      });

      setNewApiKey('');
      setNewApiKeyTier('FREE');
      await loadApiKeys();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setAddingApiKey(false);
    }
  }

  async function unassignApiKey(key: ApiKeyRow) {
    if (!window.confirm(`「${key.assignedCompanyName}」への割り当てを解除しますか？`)) return;

    try {
      await api(`/admin/api-keys/${key.id}/assignment`, { method: 'DELETE' });
      await loadApiKeys();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function loadPlanRequests() {
    try {
      const json = await api<PlanChangeRequestRow[]>('/admin/plan-change-requests');
      setPlanRequests(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function approvePlanRequest(r: PlanChangeRequestRow) {
    if (!window.confirm(`「${r.companyName}」の${r.targetPlan}プランへの変更を、入金確認の上で承認しますか？`)) return;

    setProcessingPlanRequest(r.requestId);

    try {
      await api(`/admin/plan-change-requests/${r.companyAccountId}/${r.requestId}/approve`, {
        method: 'POST',
      });
      await loadPlanRequests();
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setProcessingPlanRequest(null);
    }
  }

  async function rejectPlanRequest(r: PlanChangeRequestRow) {
    setProcessingPlanRequest(r.requestId);

    try {
      await api(`/admin/plan-change-requests/${r.companyAccountId}/${r.requestId}/reject`, {
        method: 'POST',
      });
      await loadPlanRequests();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setProcessingPlanRequest(null);
    }
  }

  async function resetPassword(company: CompanyRow) {
    if (!window.confirm(`「${company.displayName}」のパスワードを再発行しますか？\n現在のパスワードは使えなくなります。`)) {
      return;
    }

    try {
      const result = await api<{ companyCode: string; password: string }>(
        `/admin/companies/${company.id}/reset-password`,
        { method: 'POST' },
      );

      alert(
        `新しいログイン情報です。この画面を閉じると二度と表示されません。\n\n会社コード: ${result.companyCode}\nパスワード: ${result.password}`,
      );
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function toggleActive(company: CompanyRow) {
    try {
      await api(`/admin/companies/${company.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !company.isActive }),
      });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  async function createCompany() {
    if (!newName.trim()) return;

    setCreating(true);

    try {
      const result = await api<{ companyCode: string; password: string; dbName: string }>(
        '/admin/companies',
        {
          method: 'POST',
          body: JSON.stringify({
            displayName: newName,
            companyCode: newCode.trim() ? newCode.trim().toUpperCase() : undefined,
          }),
        },
      );

      alert(
        `会社を作成しました。この画面を閉じると二度と表示されません。\n\n会社コード: ${result.companyCode}\nパスワード: ${result.password}\nDB: ${result.dbName}`,
      );

      setNewName('');
      setNewCode('');
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await api('/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  if (!checked) {
    return <div className="text-center text-[var(--muted)] py-10">読み込み中...</div>;
  }

  return (
    <div className="admin-shell">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-[var(--muted)]">
          {myUsername ? `担当者: ${myUsername}` : '共有パスワードでログイン中'}
        </div>
        <button onClick={logout} className="btn btn-ghost btn-sm">
          ログアウト
        </button>
      </div>

      <div className="panel mb-4">
        <h2 className="disp text-xl mb-3">新しい会社を作成</h2>
        <div className="grid2 mb-3">
          <label className="field-label">
            表示名（会社名）
            <input
              className="input"
              placeholder="例: 山田自動車整備"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <label className="field-label">
            会社コード（未入力なら自動生成）
            <input
              className="input uppercase"
              placeholder="例: YAMADA01"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
        </div>
        <button onClick={createCompany} disabled={creating} className="btn btn-blue">
          {creating ? '作成中...' : '➕ 会社を作成する'}
        </button>
        <p className="note mt-2 text-xs text-[var(--muted)]">
          LINE公式アカウントとの連携は、作成後にLINE Developersコンソールで発行した情報をこちらで別途設定してください。
        </p>
      </div>

      <div className="panel">
        <h2 className="disp text-xl mb-3">会社一覧（{companies.length}）</h2>

        {companies.length === 0 ? (
          <div className="empty">会社がまだありません。</div>
        ) : (
          companies.map((c) => (
            <div key={c.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{c.displayName}</span>
                  <span className="ml-2 mono text-xs text-[var(--muted)]">{c.companyCode}</span>
                  <span className="expbadge ml-2">{c.currentPlan ?? 'FREE'}</span>
                  {c.trialDaysRemaining != null && (
                    <span className="expbadge exp-warn ml-2">
                      お試し残り{c.trialDaysRemaining}日
                    </span>
                  )}
                  {!c.isActive && <span className="expbadge exp-warn ml-2">無効</span>}
                  {c.lineConnected && <span className="ml-2 text-xs text-[var(--muted)]">LINE連携済み</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resetPassword(c)} className="btn btn-blue btn-sm">
                    🔑 パスワード再発行
                  </button>
                  <button onClick={() => toggleActive(c)} className="btn btn-ghost btn-sm">
                    {c.isActive ? '無効化' : '有効化'}
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">DB: {c.dbName}</div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-3">プラン変更申請</h2>
        <p className="note mb-3">
          有料プランへの変更は、入金確認後にここで承認して初めて実際に切り替わります(会社側の画面からは承認できません)。
        </p>

        {planRequests.length === 0 ? (
          <div className="empty">承認待ちの申請はありません。</div>
        ) : (
          planRequests.map((r) => (
            <div key={`${r.companyAccountId}-${r.requestId}`} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{r.companyName}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {r.targetPlan}プランへ変更（{PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}）
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approvePlanRequest(r)}
                    disabled={processingPlanRequest === r.requestId}
                    className="btn btn-primary btn-sm"
                  >
                    入金確認・承認
                  </button>
                  <button
                    onClick={() => rejectPlanRequest(r)}
                    disabled={processingPlanRequest === r.requestId}
                    className="btn btn-ghost btn-sm"
                  >
                    却下
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-3">担当者アカウント</h2>
        <p className="note mb-3">
          運営管理画面にログインできる担当者を個別に発行できます。共有パスワードでのログインより安全です。
        </p>

        <div className="grid2 mb-3">
          <label className="field-label">
            ユーザー名
            <input
              className="input"
              placeholder="例: yamada"
              value={newAdminUsername}
              onChange={(e) => setNewAdminUsername(e.target.value)}
            />
          </label>
          <label className="field-label">
            表示名（任意）
            <input
              className="input"
              placeholder="例: 山田"
              value={newAdminDisplayName}
              onChange={(e) => setNewAdminDisplayName(e.target.value)}
            />
          </label>
        </div>
        <button onClick={createAdminUser} disabled={creatingAdmin} className="btn btn-blue mb-4">
          {creatingAdmin ? '作成中...' : '➕ 担当者を追加する'}
        </button>

        {adminUsers.length === 0 ? (
          <div className="empty">担当者アカウントはまだありません（共有パスワードでログイン中です）。</div>
        ) : (
          adminUsers.map((u) => (
            <div key={u.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{u.username}</span>
                  {u.displayName && (
                    <span className="ml-2 text-xs text-[var(--muted)]">{u.displayName}</span>
                  )}
                  {u.username === myUsername && (
                    <span className="expbadge ml-2">ログイン中</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetAdminUserPassword(u)}
                    className="btn btn-blue btn-sm"
                  >
                    🔑 パスワード再発行
                  </button>
                  <button
                    onClick={() => deleteAdminUser(u)}
                    disabled={u.username === myUsername}
                    className="btn btn-ghost btn-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-3">APIキープール（Gemini）</h2>
        <p className="note mb-3">
          全社共有のGemini APIキープールです。会社が新規作成される際、ここから未割り当てのキーが自動で割り当てられます。
        </p>

        <div className="grid2 mb-3">
          <label className="field-label">
            APIキー
            <input
              className="input"
              placeholder="AQ.xxxxxxxxxxxxxxxxxxxx"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
            />
          </label>
          <label className="field-label">
            グレード
            <select
              className="input"
              value={newApiKeyTier}
              onChange={(e) => setNewApiKeyTier(e.target.value as 'FREE' | 'PAID')}
            >
              <option value="FREE">無料枠(FREE)</option>
              <option value="PAID">有料枠(PAID)</option>
            </select>
          </label>
        </div>
        <button onClick={addApiKey} disabled={addingApiKey} className="btn btn-blue mb-4">
          {addingApiKey ? '登録中...' : '➕ キーを登録する'}
        </button>

        {apiKeys.length === 0 ? (
          <div className="empty">登録されているAPIキーはありません。</div>
        ) : (
          apiKeys.map((k) => (
            <div key={k.id} className="veh mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="mono font-semibold">{k.maskedKey}</span>
                  <span className="expbadge ml-2">{k.tier === 'PAID' ? '有料枠' : '無料枠'}</span>
                  {k.assignedCompanyName ? (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      割当先: {k.assignedCompanyName}
                    </span>
                  ) : (
                    <span className="ml-2 text-xs text-[var(--muted)]">未割当</span>
                  )}
                </div>
                {k.assignedCompanyName && (
                  <button onClick={() => unassignApiKey(k)} className="btn btn-ghost btn-sm">
                    割当解除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-3">エラー報告（{errorReports.length}）</h2>
        <p className="note mb-3">
          デモプレイ版の会社が画面から送った不具合報告の一覧です。送信時にLINEにもプッシュ通知が届きます。
        </p>

        {errorReports.length === 0 ? (
          <div className="empty">まだ報告はありません。</div>
        ) : (
          errorReports.map((r) => (
            <div key={r.id} className="veh mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold">{r.companyName}</span>
                  <span className="ml-2 mono text-xs text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString('ja-JP')}
                  </span>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    画面: {r.pageLabel || r.pageUrl}
                  </div>
                  {r.message && <div className="text-sm mt-1">{r.message}</div>}
                  {r.userAgent && (
                    <div className="text-xs text-[var(--muted)] mt-1">環境: {r.userAgent}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel mt-4">
        <h2 className="disp text-xl mb-3">顧客ポータル 有料フラグ(テスト用)</h2>
        <p className="note mb-3">
          決済連携ができるまでの暫定措置です。会社側の画面には出していません。いずれ廃止予定です。
        </p>

        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="顧客名で検索(全社横断)"
            value={portalQuery}
            onChange={(e) => setPortalQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchPortalCustomers()}
          />
          <button
            onClick={searchPortalCustomers}
            disabled={!portalQuery.trim() || portalSearching}
            className="btn btn-blue btn-sm"
          >
            {portalSearching ? '検索中...' : '検索'}
          </button>
        </div>

        {portalCustomers && (
          portalCustomers.length === 0 ? (
            <div className="empty">該当する顧客が見つかりませんでした。</div>
          ) : (
            portalCustomers.map((c) => (
              <div key={`${c.companyAccountId}-${c.id}`} className="veh mb-2 flex justify-between items-center">
                <div>
                  <span className="font-semibold">{c.customerName}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">{c.companyName}</span>
                  <span className={`ml-2 ${c.portalPaid ? 'badge-ok' : 'expbadge'}`}>
                    {c.portalPaid ? '✅ 有料' : '無料'}
                  </span>
                </div>
                <button
                  onClick={() => togglePortalPaid(c)}
                  disabled={portalTogglingId === c.id}
                  className="btn btn-ghost btn-sm"
                >
                  {c.portalPaid ? '無料に戻す' : '有料にする'}
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
