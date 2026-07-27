// frontend/app/login/page.tsx

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, extractErrorMessage } from '@/lib/api';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'company' | 'staff'>('company');

  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [staffCode, setStaffCode] = useState('');
  const [autoEntering, setAutoEntering] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // LINEの「🔑 入室する」ボタンから、入室IDを埋め込んだURLで開かれた場合は
    // 自動でログインを試みる(端末のブラウザ(LINE内蔵ブラウザ含む)を問わず動く)
    const codeFromUrl = searchParams.get('staffCode');

    if (!codeFromUrl) return;

    setMode('staff');
    setStaffCode(codeFromUrl);
    autoStaffLogin(codeFromUrl);

    // URLバー・履歴に入室IDが残らないよう、すぐにクエリを消しておく
    router.replace('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoStaffLogin(code: string) {
    setAutoEntering(true);
    setLoading(true);
    setMessage('');

    try {
      await api('/auth/staff-login', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      router.replace('/');
    } catch (e: any) {
      setAutoEntering(false);
      setMessage(extractErrorMessage(e) || '入室に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    if (!companyCode.trim() || !password) return;

    setLoading(true);
    setMessage('');

    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ companyCode: companyCode.toUpperCase(), password }),
      });

      router.replace('/');
    } catch (e: any) {
      setMessage(extractErrorMessage(e) || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function staffLogin() {
    if (!staffCode.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      await api('/auth/staff-login', {
        method: 'POST',
        body: JSON.stringify({ code: staffCode.trim() }),
      });

      router.replace('/');
    } catch (e: any) {
      setMessage(extractErrorMessage(e) || '入室に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (autoEntering) {
    return (
      <div className="license-shell">
        <div className="panel license-card">
          <div className="mb-8 text-center">
            <div className="license-logo">🔧</div>

            <h1 className="gk-apptitle license-title">
              <span className="gk-apptitle-accent">ガレージ</span>・カルテ
            </h1>
          </div>

          <div className="text-center text-sm text-[var(--muted)]">入室しています...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="license-shell">
      <div className="panel license-card">
        <div className="mb-8 text-center">
          <div className="license-logo">🔧</div>

          <h1 className="gk-apptitle license-title">
            <span className="gk-apptitle-accent">ガレージ</span>・カルテ
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('company');
              setMessage('');
            }}
            className={mode === 'company' ? 'btn btn-primary flex-1 justify-center' : 'btn btn-ghost flex-1 justify-center'}
          >
            会社としてログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('staff');
              setMessage('');
            }}
            className={mode === 'staff' ? 'btn btn-primary flex-1 justify-center' : 'btn btn-ghost flex-1 justify-center'}
          >
            🔑 スタッフとして入室
          </button>
        </div>

        {mode === 'company' ? (
          <>
            <input
              className="input mb-4 text-center text-xl uppercase"
              placeholder="会社コード"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              autoCapitalize="characters"
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
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--muted)] mb-3 text-center">
              社員用LINEに届いた「入室ID」を入力してください。
            </p>

            <input
              className="input mb-6 text-center text-xl uppercase mono"
              placeholder="入室ID"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter') staffLogin();
              }}
            />

            <button
              onClick={staffLogin}
              disabled={loading}
              className="btn btn-primary w-full justify-center text-lg"
            >
              {loading ? '入室中...' : '入室する'}
            </button>
          </>
        )}

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          {message}
        </div>
      </div>
    </div>
  );
}
