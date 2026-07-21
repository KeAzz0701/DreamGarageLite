// frontend/components/settings/PasswordManagerCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface PasswordInfo {
  setupPassword: string;
  maxDevices: number;
  usedDevices: number;
  expireAt: string | null;
}

interface Props {
  companyId: number;
}

export default function PasswordManagerCard({
  companyId,
}: Props) {
  const [info, setInfo] =
    useState<PasswordInfo>();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `http://localhost:3001/api/password/${companyId}`,
    );

    if (!res.ok) return;

    setInfo(await res.json());
  }

  async function regenerate() {
    setLoading(true);

    const res = await fetch(
      `http://localhost:3001/api/password/${companyId}/regenerate`,
      {
        method: 'POST',
      },
    );

    if (res.ok) {
      setInfo(await res.json());
    }

    setLoading(false);
  }

  if (!info) return null;

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          セットアップキー管理
        </h2>

        <div className="mt-2 text-gray-500">
          このキーだけで全API・URL・ライセンスを
          自動設定できます
        </div>

      </div>

      <div className="space-y-6 p-6">

        <div>

          <label className="font-semibold">
            セットアップキー
          </label>

          <input
            readOnly
            value={info.setupPassword}
            className="mt-2 w-full rounded-xl border bg-gray-50 p-4 font-mono text-lg"
          />

        </div>

        <div className="grid grid-cols-3 gap-5">

          <div className="rounded-xl bg-slate-100 p-5">

            <div className="text-sm text-gray-500">
              使用中
            </div>

            <div className="mt-2 text-3xl font-bold">
              {info.usedDevices}
            </div>

          </div>

          <div className="rounded-xl bg-slate-100 p-5">

            <div className="text-sm text-gray-500">
              利用可能
            </div>

            <div className="mt-2 text-3xl font-bold">
              {info.maxDevices === 9999
                ? '∞'
                : info.maxDevices}
            </div>

          </div>

          <div className="rounded-xl bg-slate-100 p-5">

            <div className="text-sm text-gray-500">
              有効期限
            </div>

            <div className="mt-2 text-lg font-bold">
              {info.expireAt ?? '無期限'}
            </div>

          </div>

        </div>

        <button
          disabled={loading}
          onClick={regenerate}
          className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white"
        >
          {loading
            ? '再発行中...'
            : 'セットアップキー再発行'}
        </button>

      </div>

    </div>
  );
}