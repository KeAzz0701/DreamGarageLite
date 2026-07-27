// frontend/components/layout/ErrorReportButton.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, extractErrorMessage } from '@/lib/api';

export default function ErrorReportButton() {
  const [isDemo, setIsDemo] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<any>('/company')
      .then((company) => {
        if (!company) return;
        return api<any>(`/license/company/${company.id}/plans`).then((planInfo) => {
          setIsDemo(planInfo?.current?.plan === 'DEMO');
        });
      })
      .catch(() => {});
  }, []);

  async function submit() {
    setSending(true);

    try {
      await api('/error-reports', {
        method: 'POST',
        body: JSON.stringify({
          pageUrl: window.location.href,
          pageLabel: document.title || undefined,
          message: message.trim() || undefined,
        }),
      });

      alert('報告ありがとうございます。運営に届きました。');
      setMessage('');
      setOpen(false);
    } catch (e: any) {
      alert(extractErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  if (!isDemo) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          zIndex: 1000,
          borderRadius: 999,
          padding: '10px 16px',
          background: 'var(--danger)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        🚨 エラー報告
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="panel"
            style={{ maxWidth: 420, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="disp text-lg mb-2">エラー・不具合を報告</h2>
            <p className="text-xs text-[var(--muted)] mb-3">
              今の画面(URL)は自動で一緒に送られます。気づいたことを一言添えてください(任意)。
            </p>
            <textarea
              rows={4}
              className="input mb-3"
              placeholder="例: 予約を保存しようとしたら反応がなくなった"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={submit} disabled={sending} className="btn btn-primary">
                {sending ? '送信中...' : '送信する'}
              </button>
              <button onClick={() => setOpen(false)} className="btn btn-ghost">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
