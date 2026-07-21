// frontend/components/settings/LicenseGeneratorCard.tsx

'use client';

import { useState } from 'react';

interface GenerateResult {
  licenseKey: string;
  setupPassword: string;
  plan: string;
  expireAt: string | null;
}

export default function LicenseGeneratorCard() {
  const [plan, setPlan] =
    useState('FREE');

  const [maxUsers, setMaxUsers] =
    useState(1);

  const [maxOcr, setMaxOcr] =
    useState(30);

  const [expireDays, setExpireDays] =
    useState(365);

  const [unlimited, setUnlimited] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<GenerateResult>();

  async function generate() {
    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/admin/license/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          plan,
          maxUsers,
          maxOcr,
          expireDays,
          unlimited,
        }),
      },
    );

    setResult(await res.json());

    setLoading(false);
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          ライセンス発行
        </h2>

        <div className="mt-2 text-gray-500">

          発行したセットアップキーだけで
          URL・API・ライセンスを
          自動登録できます。

        </div>

      </div>

      <div className="grid grid-cols-2 gap-5 p-6">

        <div>

          <label>プラン</label>

          <select
            className="mt-2 w-full rounded-xl border p-3"
            value={plan}
            onChange={(e) =>
              setPlan(e.target.value)
            }
          >
            <option>FREE</option>
            <option>LITE</option>
            <option>STANDARD</option>
            <option>PRO</option>
          </select>

        </div>

        <div>

          <label>利用人数</label>

          <input
            type="number"
            className="mt-2 w-full rounded-xl border p-3"
            value={maxUsers}
            onChange={(e) =>
              setMaxUsers(Number(e.target.value))
            }
          />

        </div>

        <div>

          <label>OCR件数</label>

          <input
            type="number"
            className="mt-2 w-full rounded-xl border p-3"
            value={maxOcr}
            onChange={(e) =>
              setMaxOcr(Number(e.target.value))
            }
          />

        </div>

        <div>

          <label>有効期限(日)</label>

          <input
            type="number"
            className="mt-2 w-full rounded-xl border p-3"
            value={expireDays}
            onChange={(e) =>
              setExpireDays(Number(e.target.value))
            }
          />

        </div>

        <div className="col-span-2 flex items-center gap-3">

          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) =>
              setUnlimited(e.target.checked)
            }
          />

          無期限ライセンス

        </div>

        <div className="col-span-2">

          <button
            disabled={loading}
            onClick={generate}
            className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
          >
            {loading
              ? '発行中...'
              : 'ライセンス発行'}
          </button>

        </div>

      </div>

      {result && (

        <div className="border-t bg-green-50 p-6">

          <div className="font-bold mb-4">

            発行完了

          </div>

          <div className="space-y-3">

            <div>

              ライセンスキー

              <div className="rounded bg-white p-3 font-mono">

                {result.licenseKey}

              </div>

            </div>

            <div>

              セットアップキー

              <div className="rounded bg-white p-3 font-mono">

                {result.setupPassword}

              </div>

            </div>

            <div>

              プラン：
              {result.plan}

            </div>

            <div>

              有効期限：
              {result.expireAt ?? '無期限'}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}