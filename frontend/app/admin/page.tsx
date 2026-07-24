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
  lineConnected: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api('/admin/me')
      .then(() => {
        setChecked(true);
        load();
      })
      .catch(() => router.replace('/admin/login'));
  }, []);

  async function load() {
    try {
      const json = await api<CompanyRow[]>('/admin/companies');
      setCompanies(json);
    } catch (e: any) {
      alert(extractErrorMessage(e));
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
      <div className="flex justify-end mb-4">
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
    </div>
  );
}
