// frontend/components/settings/BackupRestoreCard.tsx

'use client';

import { useState } from 'react';

export default function BackupRestoreCard() {
  const [loading, setLoading] =
    useState(false);

  async function backup() {
    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/admin/backup',
        {
          method: 'POST',
        },
      );

      const json = await res.json();

      alert(
        `バックアップ完了\n${json.fileName}`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function restore(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    const form = new FormData();

    form.append('file', file);

    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/admin/restore',
        {
          method: 'POST',
          body: form,
        },
      );

      if (!res.ok) {
        throw new Error();
      }

      alert('復元完了');
    } catch {
      alert('復元に失敗しました');
    }

    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          バックアップ・復元
        </h2>

        <div className="mt-2 text-gray-500">
          データベース全体をバックアップ・復元します
        </div>

      </div>

      <div className="space-y-6 p-6">

        <button
          disabled={loading}
          onClick={backup}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
        >
          {loading
            ? 'バックアップ中...'
            : 'バックアップ作成'}
        </button>

        <label className="block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center hover:bg-gray-50">

          <div className="text-lg font-bold">
            バックアップファイルを選択
          </div>

          <div className="mt-2 text-sm text-gray-500">
            ZIP / SQL / JSON 対応
          </div>

          <input
            hidden
            type="file"
            accept=".zip,.sql,.json"
            onChange={restore}
          />

        </label>

      </div>

    </div>
  );
}