// frontend/components/settings/NotificationSettingsCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  lineEnabled: boolean;
  browserEnabled: boolean;

  vehicleInspectionDays: number;
  insuranceDays: number;
  oilChangeKm: number;
}

export default function NotificationSettingsCard() {
  const [settings, setSettings] =
    useState<NotificationSettings>({
      emailEnabled: true,
      smsEnabled: false,
      lineEnabled: false,
      browserEnabled: true,
      vehicleInspectionDays: 30,
      insuranceDays: 30,
      oilChangeKm: 5000,
    });

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/settings/notification',
    );

    if (!res.ok) return;

    setSettings(await res.json());
  }

  function update(
    key: keyof NotificationSettings,
    value: boolean | number,
  ) {
    setSettings({
      ...settings,
      [key]: value,
    });
  }

  async function save() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/settings/notification',
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

    alert('通知設定を保存しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          通知設定
        </h2>

        <div className="mt-2 text-gray-500">
          車検・保険・オイル交換の通知方法を設定します
        </div>

      </div>

      <div className="space-y-6 p-6">

        <div className="grid grid-cols-2 gap-4">

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) =>
                update(
                  'emailEnabled',
                  e.target.checked,
                )
              }
            />
            メール通知
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(e) =>
                update(
                  'smsEnabled',
                  e.target.checked,
                )
              }
            />
            SMS通知
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.lineEnabled}
              onChange={(e) =>
                update(
                  'lineEnabled',
                  e.target.checked,
                )
              }
            />
            LINE通知
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.browserEnabled}
              onChange={(e) =>
                update(
                  'browserEnabled',
                  e.target.checked,
                )
              }
            />
            ブラウザ通知
          </label>

        </div>

        <hr />

        <div>

          <label>
            車検通知（日前）
          </label>

          <input
            type="number"
            className="mt-2 w-full rounded-lg border p-3"
            value={settings.vehicleInspectionDays}
            onChange={(e) =>
              update(
                'vehicleInspectionDays',
                Number(e.target.value),
              )
            }
          />

        </div>

        <div>

          <label>
            任意保険通知（日前）
          </label>

          <input
            type="number"
            className="mt-2 w-full rounded-lg border p-3"
            value={settings.insuranceDays}
            onChange={(e) =>
              update(
                'insuranceDays',
                Number(e.target.value),
              )
            }
          />

        </div>

        <div>

          <label>
            オイル交換通知（km）
          </label>

          <input
            type="number"
            className="mt-2 w-full rounded-lg border p-3"
            value={settings.oilChangeKm}
            onChange={(e) =>
              update(
                'oilChangeKm',
                Number(e.target.value),
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
            : '通知設定を保存'}
        </button>

      </div>

    </div>
  );
}