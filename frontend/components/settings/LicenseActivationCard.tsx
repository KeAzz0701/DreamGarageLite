// frontend/components/settings/LicenseActivationCard.tsx

'use client';

import { useState } from 'react';

interface Props {
  currentPlan: string;
  expireAt?: string | null;
  onActivated: () => void;
}

export default function LicenseActivationCard({
  currentPlan,
  expireAt,
  onActivated,
}: Props) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  async function activate() {
    if (!licenseKey.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/license/activate',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            licenseKey,
          }),
        },
      );

      if (!res.ok) {
        throw new Error();
      }

      alert('ライセンスを更新しました');

      setLicenseKey('');

      onActivated();
    } catch {
      alert('ライセンス認証に失敗しました');
    }

    setLoading(false);
  }

  return (
    <div className="panel">
      <h2 className="disp text-xl">ライセンス管理</h2>

      <div className="mt-5 space-y-4">
        <div className="grid2">
          <div>
            <div className="text-xs text-[var(--muted)]">現在のプラン</div>
            <div className="disp mt-1 text-2xl">{currentPlan}</div>
          </div>

          <div>
            <div className="text-xs text-[var(--muted)]">有効期限</div>
            <div className="mt-1 text-lg font-semibold">{expireAt ?? '無期限'}</div>
          </div>
        </div>

        <hr className="border-[var(--line)]" />

        <label className="field-label">
          ライセンスキー
          <input
            value={licenseKey}
            onChange={(e) =>
              setLicenseKey(
                e.target.value.toUpperCase(),
              )
            }
            placeholder="DG-XXXX-XXXX-XXXX"
            className="input uppercase"
          />
        </label>

        <button
          disabled={loading}
          onClick={activate}
          className="btn btn-primary w-full justify-center"
        >
          {loading ? '認証中...' : 'ライセンス認証'}
        </button>
      </div>
    </div>
  );
}
