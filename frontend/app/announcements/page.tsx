// frontend/app/announcements/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, extractErrorMessage } from '@/lib/api';

type Announcement = {
  id: number;
  title: string;
  body: string;
  publishAt: string | null;
  createdAt: string;
};

/** datetime-local入力(ローカル時刻文字列)⇔ISO文字列の変換 */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api<Announcement[]>('/announcements');
      setAnnouncements(data);
    } catch {}
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setPublishAt(toLocalInputValue(a.publishAt));
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setPublishAt('');
  }

  async function save() {
    if (!title.trim() || !body.trim()) return;

    setSaving(true);

    try {
      const payload = {
        title,
        body,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      };

      if (editingId) {
        await api(`/announcements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/announcements', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('このお知らせを削除しますか？')) return;

    try {
      await api(`/announcements/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert(extractErrorMessage(e));
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">お知らせ</h1>

        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <div className="panel space-y-4 mb-4">
        <h2 className="disp text-xl">{editingId ? 'お知らせを編集' : '新しいお知らせを投稿'}</h2>

        <label className="field-label">
          タイトル
          <input
            className="input"
            placeholder="例: 夏季休業のお知らせ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field-label">
          本文
          <textarea
            rows={4}
            className="input"
            placeholder="お客様へのお知らせ・キャンペーン内容などを入力してください"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <label className="field-label">
          公開日時(任意・指定するとこの日時以降に表示されます)
          <input
            type="datetime-local"
            className="input"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? '保存中...' : editingId ? '更新する' : '投稿する'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="btn btn-ghost">
              キャンセル
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <h2 className="disp text-xl mb-3">投稿済みのお知らせ（{announcements.length}件）</h2>

        {announcements.length === 0 ? (
          <div className="empty">まだお知らせがありません。</div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="veh mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">
                    {a.title}
                    {a.publishAt && new Date(a.publishAt).getTime() > Date.now() && (
                      <span className="expbadge ml-2">
                        ⏰ 予約投稿: {new Date(a.publishAt).toLocaleString('ja-JP')}に表示されます
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-1 whitespace-pre-wrap">
                    {a.body}
                  </div>
                  <div className="mono text-xs text-[var(--muted)] mt-2">
                    {new Date(a.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-icon" title="編集" onClick={() => startEdit(a)}>
                    ✏️
                  </button>
                  <button className="btn-icon" title="削除" onClick={() => remove(a.id)}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
