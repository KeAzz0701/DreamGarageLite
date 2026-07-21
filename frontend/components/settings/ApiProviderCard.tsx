// frontend/components/settings/ApiProviderCard.tsx

'use client';

import { useEffect, useState } from 'react';

type ProviderSettings = {
  geminiApiKey: string;
  openaiApiKey: string;
  backendUrl: string;
  storageUrl: string;
};

interface Props {
  companyId: number;
}

export default function ApiProviderCard({
  companyId,
}: Props) {
  const [data, setData] =
    useState<ProviderSettings>({
      geminiApiKey: '',
      openaiApiKey: '',
      backendUrl: '',
      storageUrl: '',
    });

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `http://localhost:3001/api/settings/provider/${companyId}`,
    );

    if (!res.ok) return;

    setData(await res.json());
  }

  async function save() {
    setLoading(true);

    await fetch(
      `http://localhost:3001/api/settings/provider/${companyId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    setLoading(false);

    alert('保存しました');
  }

  function update(
    key: keyof ProviderSettings,
    value: string,
  ) {
    setData({
      ...data,
      [key]: value,
    });
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          API設定
        </h2>

        <div className="mt-2 text-gray-500">
          手動設定が必要な場合のみ入力します
        </div>

      </div>

      <div className="space-y-5 p-6">

        <div>

          <label className="font-semibold">
            Gemini API Key
          </label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-4"
            value={data.geminiApiKey}
            onChange={(e) =>
              update(
                'geminiApiKey',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label className="font-semibold">
            OpenAI API Key
          </label>

          <input
            type="password"
            className="mt-2 w-full rounded-xl border p-4"
            value={data.openaiApiKey}
            onChange={(e) =>
              update(
                'openaiApiKey',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label className="font-semibold">
            Backend URL
          </label>

          <input
            className="mt-2 w-full rounded-xl border p-4"
            value={data.backendUrl}
            onChange={(e) =>
              update(
                'backendUrl',
                e.target.value,
              )
            }
          />

        </div>

        <div>

          <label className="font-semibold">
            Storage URL
          </label>

          <input
            className="mt-2 w-full rounded-xl border p-4"
            value={data.storageUrl}
            onChange={(e) =>
              update(
                'storageUrl',
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
            : 'API設定を保存'}
        </button>

      </div>

    </div>
  );
}