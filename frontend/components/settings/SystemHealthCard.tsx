// frontend/components/settings/SystemHealthCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface HealthStatus {
  cpu: number;
  memory: number;
  disk: number;

  database: boolean;
  backend: boolean;
  gemini: boolean;
  openai: boolean;

  uptime: string;
}

export default function SystemHealthCard() {
  const [health, setHealth] =
    useState<HealthStatus>();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  async function load() {
    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/system/health',
    );

    if (res.ok) {
      setHealth(await res.json());
    }

    setLoading(false);
  }

  function Progress(
    title: string,
    value: number,
    color: string,
  ) {
    return (
      <div>

        <div className="mb-2 flex justify-between">

          <span>{title}</span>

          <span>{value}%</span>

        </div>

        <div className="h-3 rounded-full bg-gray-200">

          <div
            className={`h-3 rounded-full ${color}`}
            style={{
              width: `${value}%`,
            }}
          />

        </div>

      </div>
    );
  }

  function Status(
    name: string,
    ok: boolean,
  ) {
    return (
      <div className="flex justify-between rounded-lg border p-3">

        <span>{name}</span>

        <span
          className={`font-bold ${
            ok
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {ok ? '正常' : '異常'}
        </span>

      </div>
    );
  }

  if (!health && loading) {

    return (
      <div className="rounded-2xl bg-white p-10 shadow-lg">

        読み込み中...

      </div>
    );

  }

  if (!health) return null;

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <h2 className="text-2xl font-bold">

          システム状態

        </h2>

        <button
          onClick={load}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white"
        >
          更新
        </button>

      </div>

      <div className="space-y-6 p-6">

        {Progress(
          'CPU',
          health.cpu,
          'bg-blue-600',
        )}

        {Progress(
          'メモリ',
          health.memory,
          'bg-green-600',
        )}

        {Progress(
          'ディスク',
          health.disk,
          'bg-orange-500',
        )}

        <hr />

        {Status(
          'Backend',
          health.backend,
        )}

        {Status(
          'Database',
          health.database,
        )}

        {Status(
          'Gemini API',
          health.gemini,
        )}

        {Status(
          'OpenAI API',
          health.openai,
        )}

        <hr />

        <div className="flex justify-between">

          <span>稼働時間</span>

          <span className="font-bold">

            {health.uptime}

          </span>

        </div>

      </div>

    </div>
  );
}