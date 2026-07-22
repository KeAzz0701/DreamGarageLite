// frontend/components/settings/GoogleCalendarIntegrationCard.tsx

'use client';

import { useEffect, useState } from 'react';
import { api, apiBaseUrl } from '@/lib/api';

interface CalendarStatus {
  connected: boolean;
  configured: boolean;
  connectedEmail?: string | null;
  calendarId?: string | null;
}

export default function GoogleCalendarIntegrationCard() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api<CalendarStatus>('/google-calendar/status');
      setStatus(data);
    } catch {}
  }

  function connect() {
    window.location.href = `${apiBaseUrl()}/google-calendar/oauth/start`;
  }

  async function disconnect() {
    if (!window.confirm('Googleカレンダー連携を解除しますか？')) return;

    setDisconnecting(true);

    try {
      await api('/google-calendar/disconnect', { method: 'POST' });
      await load();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="panel mb-4">
      <h2 className="disp text-xl mb-3">Googleカレンダー連携</h2>
      <p className="note mb-3">
        確定した予約を、この店舗専用に自動作成されるGoogleカレンダーへ反映します。
      </p>

      {!status ? (
        <div className="text-sm text-[var(--muted)]">読み込み中...</div>
      ) : status.connected ? (
        <>
          <div className="empty mb-3 text-left">
            接続済み：<span className="font-bold text-[var(--ink)]">{status.connectedEmail}</span>
          </div>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="btn btn-ghost"
          >
            {disconnecting ? '解除中...' : '連携を解除'}
          </button>
        </>
      ) : status.configured ? (
        <button onClick={connect} className="btn btn-primary">
          🔗 Googleアカウントと連携する
        </button>
      ) : (
        <div className="empty text-left">
          この機能はまだ準備中です（管理者による設定が必要です）。
        </div>
      )}
    </div>
  );
}
