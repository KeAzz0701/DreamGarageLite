// frontend/app/auto-login/page.tsx
//
// 運営管理画面で発行したQRコードから開くページ。URLのtokenをそのままログインに使い、
// 会社コード・パスワードの手入力なしでログインさせる。

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, extractErrorMessage } from '@/lib/api';

export default function AutoLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('リンクが正しくありません。');
      return;
    }

    api('/auth/auto-login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => {
        router.replace('/');
      })
      .catch((e: any) => {
        setError(extractErrorMessage(e) || 'ログインに失敗しました。');
      });
  }, [searchParams, router]);

  return (
    <div className="license-shell">
      <div className="panel text-center" style={{ maxWidth: 360 }}>
        {error ? (
          <>
            <div className="text-2xl mb-3">⚠️</div>
            <p className="note mb-3">{error}</p>
            <Link href="/login" className="btn btn-primary">
              会社コードでログインする
            </Link>
          </>
        ) : (
          <>
            <div className="text-2xl mb-3">🔧</div>
            <p className="note">ログイン中です...</p>
          </>
        )}
      </div>
    </div>
  );
}
