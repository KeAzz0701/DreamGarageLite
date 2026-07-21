// frontend/components/settings/ApiKeyCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Props {
  companyId: number;
}

export default function ApiKeyCard({
  companyId,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [password, setPassword] =
    useState('');

  const [settings, setSettings] =
    useState<any>();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `http://localhost:3001/api/settings/${companyId}`,
    );

    setSettings(await res.json());
  }

  async function activate() {
    if (!password) return;

    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/company/activate',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          companyId,
          password,
        }),
      },
    );

    if (!res.ok) {
      alert('認証失敗');
      setLoading(false);
      return;
    }

    const json = await res.json();

    setSettings(json.settings);

    alert(
      'API・URL・各種設定を自動登録しました',
    );

    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          初期セットアップ
        </h2>

        <div className="mt-2 text-gray-500">

          パスワードだけ入力すると
          URL・Gemini・OpenAI・Supabase等を
          自動設定します。

        </div>

      </div>

      <div className="space-y-5 p-6">

        <div>

          <label className="font-semibold">
            セットアップキー
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="mt-2 w-full rounded-xl border p-4"
            placeholder="********"
          />

        </div>

        <button
          onClick={activate}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-4 text-white font-bold"
        >
          {loading
            ? '設定中...'
            : '自動設定開始'}
        </button>

        {settings && (

          <div className="rounded-xl bg-green-50 p-5">

            <div className="font-bold mb-3">
              自動設定済み
            </div>

            <div>
              Backend URL
            </div>

            <div className="text-sm text-gray-600">
              {settings.apiUrl}
            </div>

            <div className="mt-3">
              Gemini API
            </div>

            <div className="text-sm text-gray-600">
              設定済
            </div>

            <div className="mt-3">
              OpenAI API
            </div>

            <div className="text-sm text-gray-600">
              設定済
            </div>

            <div className="mt-3">
              ライセンス
            </div>

            <div className="text-sm text-gray-600">
              有効
            </div>

          </div>

        )}

      </div>

    </div>
  );
}