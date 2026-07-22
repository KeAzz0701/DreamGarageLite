'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LicensePage() {
  const router = useRouter();

  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function activate() {
    if (!licenseKey.trim()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await api('/license/activate', {
        method: 'POST',
        body: JSON.stringify({ licenseKey }),
      });

      setMessage('認証成功');

      setTimeout(() => {
        router.replace('/');
      }, 500);
    } catch (e) {
      console.error(e);
      setMessage('ライセンス認証に失敗しました');
    }

    setLoading(false);
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
            ライセンス認証
          </p>
        </div>

        <input
          className="input mb-6 text-center text-xl uppercase"
          placeholder="DG-XXXX-XXXX"
          value={licenseKey}
          onChange={(e) =>
            setLicenseKey(
              e.target.value.toUpperCase(),
            )
          }
        />

        <button
          onClick={activate}
          disabled={loading}
          className="btn btn-primary w-full justify-center text-lg"
        >
          {loading ? '認証中...' : '認証する'}
        </button>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          {message}
        </div>
      </div>
    </div>
  );
}