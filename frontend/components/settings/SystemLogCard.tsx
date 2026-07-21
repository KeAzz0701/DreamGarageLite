// frontend/components/settings/SystemLogCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface LogItem {
  id: number;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  user: string;
  createdAt: string;
}

export default function SystemLogCard() {
  const [logs, setLogs] =
    useState<LogItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/admin/logs',
    );

    if (res.ok) {
      setLogs(await res.json());
    }

    setLoading(false);
  }

  function color(level: string) {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-700';

      case 'WARNING':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-green-100 text-green-700';
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <h2 className="text-2xl font-bold">

          システムログ

        </h2>

        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white"
        >
          更新
        </button>

      </div>

      <div className="max-h-[650px] overflow-y-auto">

        {logs.map((log) => (

          <div
            key={log.id}
            className="border-b p-5"
          >

            <div className="flex items-center justify-between">

              <span
                className={`rounded-lg px-3 py-1 text-sm font-bold ${color(
                  log.level,
                )}`}
              >
                {log.level}
              </span>

              <span className="text-sm text-gray-500">

                {new Date(
                  log.createdAt,
                ).toLocaleString('ja-JP')}

              </span>

            </div>

            <div className="mt-4 font-semibold">

              {log.message}

            </div>

            <div className="mt-2 text-sm text-gray-500">

              実行ユーザー：
              {log.user}

            </div>

          </div>

        ))}

        {!logs.length && !loading && (

          <div className="p-10 text-center text-gray-400">

            ログはありません

          </div>

        )}

      </div>

    </div>
  );
}