// frontend/components/settings/SmsIntegrationCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface SmsSettings {
  enabled: boolean;
  provider: 'TWILIO' | 'AWS_SNS' | 'VONAGE';

  accountSid: string;
  authToken: string;
  apiKey: string;

  senderNumber: string;
}

export default function SmsIntegrationCard() {
  const [loading, setLoading] =
    useState(false);

  const [settings, setSettings] =
    useState<SmsSettings>({
      enabled: false,
      provider: 'TWILIO',
      accountSid: '',
      authToken: '',
      apiKey: '',
      senderNumber: '',
    });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/settings/sms',
    );

    if (!res.ok) return;

    setSettings(await res.json());
  }

  function update(
    key: keyof SmsSettings,
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
      'http://localhost:3001/api/settings/sms',
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

    alert('SMS設定を保存しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          SMS連携
        </h2>

        <div className="mt-2 text-gray-500">
          車検・点検・予約リマインドをSMS送信します
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

          SMS送信を有効化

        </label>

        <div>

          <label>SMSサービス</label>

          <select
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.provider}
            onChange={(e) =>
              update(
                'provider',
                e.target.value,
              )
            }
          >
            <option value="TWILIO">
              Twilio
            </option>

            <option value="AWS_SNS">
              AWS SNS
            </option>

            <option value="VONAGE">
              Vonage
            </option>

          </select>

        </div>

        <div>

          <label>Account SID</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.accountSid}
            onChange={(e) =>
              update(
                'accountSid',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>Auth Token</label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.authToken}
            onChange={(e) =>
              update(
                'authToken',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>API Key</label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.apiKey}
            onChange={(e) =>
              update(
                'apiKey',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>送信元電話番号</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.senderNumber}
            onChange={(e) =>
              update(
                'senderNumber',
                e.target.value,
              )
            }
          />

        </div>

        <button
          disabled={loading}
          onClick={save}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
        >
          {loading
            ? '保存中...'
            : 'SMS設定を保存'}
        </button>

      </div>

    </div>
  );
}