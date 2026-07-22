// frontend/app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function login() {
    if (!companyCode.trim() || !password) return;

    setLoading(true);
    setMessage('');

    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ companyCode, password }),
      });

      router.replace('/');
    } catch (e: any) {
      setMessage(extractErrorMessage(e) || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="license-shell">
      <div className="panel license-card">
        <div className="mb-8 text-center">
          <div className="license-logo">🔧</div>

          <h1 className="gk-apptitle license-title">
            <span className="gk-apptitle-accent">ガレージ</span>カルテ
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            会社ログイン
          </p>
        </div>

        <input
          className="input mb-4 text-center text-xl uppercase"
          placeholder="会社コード"
          value={companyCode}
          onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
        />

        <input
          className="input mb-6 text-center text-xl"
          placeholder="パスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') login();
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          className="btn btn-primary w-full justify-center text-lg"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          {message}
        </div>
      </div>
    </div>
  );
}
