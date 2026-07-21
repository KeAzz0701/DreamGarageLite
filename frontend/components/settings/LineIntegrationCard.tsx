// frontend/components/settings/LineIntegrationCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface LineSettings {
  enabled: boolean;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  webhookUrl: string;
}

export default function LineIntegrationCard() {
  const [loading, setLoading] =
    useState(false);

  const [settings, setSettings] =
    useState<LineSettings>({
      enabled: false,
      channelId: '',
      channelSecret: '',
      channelAccessToken: '',
      webhookUrl: '',
    });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/settings/line',
    );

    if (!res.ok) return;

    setSettings(await res.json());
  }

  function update(
    key: keyof LineSettings,
    value: string | boolean,
  ) {
    setSettings({
      ...settings,
      [key]: value,
    });
  }

  async function save() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/settings/line',
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

    alert('LINE設定を保存しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          LINE連携
        </h2>

        <div className="mt-2 text-gray-500">
          LINE公式アカウントと接続します
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

          LINE連携を有効にする

        </label>

        <div>

          <label>Channel ID</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.channelId}
            onChange={(e) =>
              update(
                'channelId',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Channel Secret</label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.channelSecret}
            onChange={(e) =>
              update(
                'channelSecret',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Channel Access Token</label>

          <textarea
            rows={4}
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.channelAccessToken}
            onChange={(e) =>
              update(
                'channelAccessToken',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Webhook URL</label>

          <input
            readOnly
            className="mt-2 w-full rounded-xl bg-gray-100 p-3"
            value={settings.webhookUrl}
          />

        </div>

        <button
          disabled={loading}
          onClick={save}
          className="w-full rounded-xl bg-green-600 p-4 font-bold text-white"
        >
          {loading
            ? '保存中...'
            : 'LINE設定を保存'}
        </button>

      </div>

    </div>
  );
}