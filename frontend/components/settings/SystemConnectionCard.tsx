// frontend/components/settings/SystemConnectionCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Connection {
  backend: boolean;
  database: boolean;
  gemini: boolean;
  openai: boolean;
  storage: boolean;
}

export default function SystemConnectionCard() {
  const [status, setStatus] =
    useState<Connection>();

  const [loading, setLoading] =
    useState(false);

  async function check() {
    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/system/status',
      );

      setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    check();
  }, []);

  const Item = ({
    title,
    ok,
  }: {
    title: string;
    ok: boolean;
  }) => (
    <div className="flex items-center justify-between rounded-xl border p-4">

      <span className="font-semibold">
        {title}
      </span>

      <span
        className={`rounded-full px-4 py-1 text-white font-bold ${
          ok
            ? 'bg-green-600'
            : 'bg-red-600'
        }`}
      >
        {ok ? '接続中' : '未接続'}
      </span>

    </div>
  );

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <h2 className="text-2xl font-bold">
          システム接続状態
        </h2>

        <button
          onClick={check}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white font-bold"
        >
          更新
        </button>

      </div>

      {!status && (
        <div className="p-10 text-center">

          読み込み中...

        </div>
      )}

      {status && (

        <div className="space-y-4 p-6">

          <Item
            title="Backend API"
            ok={status.backend}
          />

          <Item
            title="PostgreSQL"
            ok={status.database}
          />

          <Item
            title="Gemini API"
            ok={status.gemini}
          />

          <Item
            title="OpenAI API"
            ok={status.openai}
          />

          <Item
            title="Supabase Storage"
            ok={status.storage}
          />

        </div>

      )}

    </div>
  );
}