// frontend/components/settings/UpdateManagerCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNote: string;
}

export default function UpdateManagerCard() {
  const [version, setVersion] =
    useState<VersionInfo>();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/system/version',
    );

    if (!res.ok) return;

    setVersion(await res.json());
  }

  async function update() {
    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/system/update',
        {
          method: 'POST',
        },
      );

      if (!res.ok) {
        throw new Error();
      }

      alert('アップデートを開始しました');

      load();
    } catch {
      alert('アップデートに失敗しました');
    }

    setLoading(false);
  }

  if (!version) return null;

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          システムアップデート
        </h2>

      </div>

      <div className="space-y-5 p-6">

        <div className="flex justify-between">

          <span>現在のバージョン</span>

          <span className="font-bold">
            {version.currentVersion}
          </span>

        </div>

        <div className="flex justify-between">

          <span>最新バージョン</span>

          <span className="font-bold">
            {version.latestVersion}
          </span>

        </div>

        <div
          className={`rounded-xl p-4 font-bold ${
            version.updateAvailable
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {version.updateAvailable
            ? '新しいバージョンがあります'
            : '最新版です'}
        </div>

        <div>

          <div className="mb-2 font-semibold">
            リリースノート
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 whitespace-pre-wrap">
            {version.releaseNote}
          </div>

        </div>

        <button
          disabled={
            !version.updateAvailable ||
            loading
          }
          onClick={update}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white disabled:bg-gray-400"
        >
          {loading
            ? '更新中...'
            : 'アップデート開始'}
        </button>

      </div>

    </div>
  );
}