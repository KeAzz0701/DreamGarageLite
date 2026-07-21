// frontend/components/settings/AutoSetupCard.tsx

'use client';

import { useState } from 'react';

interface AutoSetupResult {
  companyName: string;
  apiUrl: string;
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  storageConfigured: boolean;
  databaseConfigured: boolean;
  licensePlan: string;
  expiresAt: string | null;
}

export default function AutoSetupCard() {
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<AutoSetupResult | null>(null);

  async function execute() {
    if (!setupKey.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(
        'http://localhost:3001/api/setup/auto',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            setupKey,
          }),
        },
      );

      if (!res.ok) {
        throw new Error();
      }

      const json = await res.json();

      setResult(json);

      alert('初期設定が完了しました');
    } catch {
      alert('セットアップキーが正しくありません');
    }

    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          ワンタッチ初期設定
        </h2>

        <p className="mt-2 text-gray-500">

          セットアップキーを入力するだけで
          URL・API・ライセンス・クラウド設定を
          自動で構成します。

        </p>

      </div>

      <div className="space-y-5 p-6">

        <input
          type="password"
          placeholder="セットアップキー"
          value={setupKey}
          onChange={(e) =>
            setSetupKey(e.target.value)
          }
          className="w-full rounded-xl border p-4"
        />

        <button
          onClick={execute}
          disabled={loading}
          className="w-full rounded-xl bg-green-600 p-4 font-bold text-white hover:bg-green-700"
        >
          {loading
            ? '自動設定中...'
            : '自動セットアップ開始'}
        </button>

        {result && (

          <div className="rounded-xl bg-green-50 p-5">

            <div className="font-bold text-lg mb-4">
              設定完了
            </div>

            <div className="space-y-2 text-sm">

              <div>
                会社：
                {result.companyName}
              </div>

              <div>
                Backend：
                {result.apiUrl}
              </div>

              <div>
                Gemini：
                {result.geminiConfigured ? '✓' : '×'}
              </div>

              <div>
                OpenAI：
                {result.openaiConfigured ? '✓' : '×'}
              </div>

              <div>
                Storage：
                {result.storageConfigured ? '✓' : '×'}
              </div>

              <div>
                Database：
                {result.databaseConfigured ? '✓' : '×'}
              </div>

              <div>
                ライセンス：
                {result.licensePlan}
              </div>

              <div>
                有効期限：
                {result.expiresAt ?? '無期限'}
              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}