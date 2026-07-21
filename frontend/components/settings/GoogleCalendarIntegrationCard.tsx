// frontend/components/settings/GoogleCalendarIntegrationCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface CalendarSettings {
  enabled: boolean;

  clientId: string;
  clientSecret: string;

  redirectUri: string;

  calendarId: string;

  connected: boolean;
}

export default function GoogleCalendarIntegrationCard() {
  const [loading, setLoading] =
    useState(false);

  const [settings, setSettings] =
    useState<CalendarSettings>({
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      calendarId: '',
      connected: false,
    });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/settings/google-calendar',
    );

    if (!res.ok) return;

    setSettings(await res.json());
  }

  function update(
    key: keyof CalendarSettings,
    value: any,
  ) {
    setSettings({
      ...settings,
      [key]: value,
    });
  }

  async function save() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/settings/google-calendar',
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(settings),
      },
    );

    setLoading(false);

    alert('Google Calendar設定を保存しました');
  }

  async function connect() {
    window.location.href =
      'http://localhost:3001/api/google-calendar/oauth';
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          Googleカレンダー連携
        </h2>

        <div className="mt-2 text-gray-500">
          来店予約・車検・整備予定を自動登録します
        </div>

      </div>

      <div className="space-y-5 p-6">

        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              update(
                'enabled',
                e.target.checked,
              )
            }
          />

          Googleカレンダー連携を有効化

        </label>

        <div>

          <label>Client ID</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.clientId}
            onChange={(e) =>
              update(
                'clientId',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Client Secret</label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.clientSecret}
            onChange={(e) =>
              update(
                'clientSecret',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Redirect URI</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.redirectUri}
            onChange={(e) =>
              update(
                'redirectUri',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Calendar ID</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.calendarId}
            onChange={(e) =>
              update(
                'calendarId',
                e.target.value,
              )
            }
          />

        </div>

        <div className="rounded-xl bg-slate-100 p-4">

          接続状態：
          <span
            className={`ml-2 font-bold ${
              settings.connected
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {settings.connected
              ? '接続済み'
              : '未接続'}
          </span>

        </div>

        <div className="grid grid-cols-2 gap-5">

          <button
            disabled={loading}
            onClick={save}
            className="rounded-xl bg-blue-600 p-4 font-bold text-white"
          >
            {loading
              ? '保存中...'
              : '設定を保存'}
          </button>

          <button
            onClick={connect}
            className="rounded-xl bg-green-600 p-4 font-bold text-white"
          >
            Google認証
          </button>

        </div>

      </div>

    </div>
  );
}