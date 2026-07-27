// frontend/app/ocr/line-submissions/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Submission = {
  id: number;
  createdAt: string;
  customer: { id: number; customerName: string };
};

export default function LineOcrSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const json = await api<Submission[]>('/ocr/line-submissions');
      setSubmissions(json);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">LINEで届いた車検証</h1>

        <Link href="/ocr" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty">読み込み中...</div>
        ) : submissions.length === 0 ? (
          <div className="empty">確認待ちの車検証画像はありません。</div>
        ) : (
          submissions.map((s) => (
            <Link
              key={s.id}
              href={`/ocr/line-submissions/${s.id}`}
              className="veh mb-2 block"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{s.customer?.customerName ?? '不明な顧客'}</span>
                <span className="mono text-xs text-[var(--muted)]">
                  {new Date(s.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
