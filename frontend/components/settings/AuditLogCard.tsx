// frontend/components/settings/AuditLogCard.tsx

'use client';

import { useEffect, useState } from 'react';
import { normalizeForSearch } from '@/lib/kana';

interface AuditLog {
  id: number;
  action: string;
  category: string;
  user: string;
  ip: string;
  createdAt: string;
}

export default function AuditLogCard() {
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [keyword, setKeyword] =
    useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/admin/audit-log',
    );

    if (res.ok) {
      setLogs(await res.json());
    }

    setLoading(false);
  }

  const filtered = logs.filter((log) =>
    normalizeForSearch(JSON.stringify(log)).includes(normalizeForSearch(keyword)),
  );

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-bold">
            監査ログ
          </h2>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white"
          >
            更新
          </button>

        </div>

        <input
          className="mt-5 w-full rounded-xl border p-3"
          placeholder="ログ検索..."
          value={keyword}
          onChange={(e) =>
            setKeyword(e.target.value)
          }
        />

      </div>

      <div className="max-h-[700px] overflow-y-auto">

        <table className="w-full">

          <thead className="sticky top-0 bg-slate-100">

            <tr>

              <th className="p-3 text-left">
                日時
              </th>

              <th className="p-3 text-left">
                ユーザー
              </th>

              <th className="p-3 text-left">
                操作
              </th>

              <th className="p-3 text-left">
                種別
              </th>

              <th className="p-3 text-left">
                IP
              </th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((log) => (

              <tr
                key={log.id}
                className="border-b hover:bg-slate-50"
              >

                <td className="p-3">

                  {new Date(
                    log.createdAt,
                  ).toLocaleString('ja-JP')}

                </td>

                <td className="p-3">

                  {log.user}

                </td>

                <td className="p-3">

                  {log.action}

                </td>

                <td className="p-3">

                  {log.category}

                </td>

                <td className="p-3 font-mono">

                  {log.ip}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {!filtered.length &&
          !loading && (

            <div className="p-10 text-center text-gray-400">

              ログはありません

            </div>

          )}

      </div>

    </div>
  );
}