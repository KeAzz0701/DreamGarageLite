// frontend/components/settings/EmailIntegrationCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface EmailSettings {
  enabled: boolean;

  provider: 'SMTP' | 'SENDGRID' | 'RESEND';

  host: string;
  port: number;

  username: string;
  password: string;

  apiKey: string;

  senderName: string;
  senderEmail: string;
}

export default function EmailIntegrationCard() {
  const [loading, setLoading] =
    useState(false);

  const [settings, setSettings] =
    useState<EmailSettings>({
      enabled: false,
      provider: 'SMTP',
      host: '',
      port: 587,
      username: '',
      password: '',
      apiKey: '',
      senderName: '',
      senderEmail: '',
    });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/settings/email',
    );

    if (!res.ok) return;

    setSettings(await res.json());
  }

  function update(
    key: keyof EmailSettings,
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
      'http://localhost:3001/api/settings/email',
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

    alert('メール設定を保存しました');
  }

  async function testMail() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/settings/email/test',
      {
        method: 'POST',
      },
    );

    setLoading(false);

    alert('テストメールを送信しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          メール連携
        </h2>

        <div className="mt-2 text-gray-500">
          車検案内・予約確認・お知らせメールを送信します
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

          メール送信を有効化

        </label>

        <div>

          <label>メールサービス</label>

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
            <option value="SMTP">
              SMTP
            </option>

            <option value="SENDGRID">
              SendGrid
            </option>

            <option value="RESEND">
              Resend
            </option>

          </select>

        </div>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <label>SMTP Host</label>

            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={settings.host}
              onChange={(e) =>
                update(
                  'host',
                  e.target.value,
                )
              }
            />

          </div>

          <div>

            <label>Port</label>

            <input
              type="number"
              className="mt-2 w-full rounded-xl border p-3"
              value={settings.port}
              onChange={(e) =>
                update(
                  'port',
                  Number(e.target.value),
                )
              }
            />

          </div>

        </div>

        <div>

          <label>ユーザー名</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.username}
            onChange={(e) =>
              update(
                'username',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label>パスワード</label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-3"
            value={settings.password}
            onChange={(e) =>
              update(
                'password',
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

        <div className="grid grid-cols-2 gap-5">

          <div>

            <label>送信者名</label>

            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={settings.senderName}
              onChange={(e) =>
                update(
                  'senderName',
                  e.target.value,
                )
              }
            />

          </div>

          <div>

            <label>送信元メール</label>

            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={settings.senderEmail}
              onChange={(e) =>
                update(
                  'senderEmail',
                  e.target.value,
                )
              }
            />

          </div>

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
            disabled={loading}
            onClick={testMail}
            className="rounded-xl bg-green-600 p-4 font-bold text-white"
          >
            テスト送信
          </button>

        </div>

      </div>

    </div>
  );
}