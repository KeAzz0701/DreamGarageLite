// frontend/app/admin/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function login() {
    if (!password) return;

    setLoading(true);
    setMessage('');

    try {
      await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() || undefined, password }),
      });

      router.replace('/admin');
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
          <div className="license-logo">🛠️</div>
          <h1 className="gk-apptitle license-title">運営管理画面</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            会社ログインとは別の、運営者用のログインです
          </p>
        </div>

        <input
          className="input mb-4 text-center text-xl"
          placeholder="ユーザー名(担当者アカウントのみ)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        <div className="relative mb-6">
          <input
            className="input pr-12 text-center text-xl"
            placeholder="パスワード"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') login();
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[var(--muted)]"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button
          onClick={login}
          disabled={loading}
          className="btn btn-primary w-full justify-center text-lg"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">{message}</div>
      </div>
    </div>
  );
}
