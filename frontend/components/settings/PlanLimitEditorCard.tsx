// frontend/components/settings/PlanLimitEditorCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface PlanLimit {
  plan: 'FREE' | 'LITE' | 'STANDARD' | 'PRO';

  maxUsers: number;
  maxOcr: number;

  expireDays: number;

  active: boolean;
}

export default function PlanLimitEditorCard() {
  const [plans, setPlans] =
    useState<PlanLimit[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/admin/plans',
    );

    if (!res.ok) return;

    setPlans(await res.json());
  }

  function update(
    index: number,
    key: keyof PlanLimit,
    value: any,
  ) {
    const copy = [...plans];

    copy[index] = {
      ...copy[index],
      [key]: value,
    };

    setPlans(copy);
  }

  async function save() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/admin/plans',
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(plans),
      },
    );

    setLoading(false);

    alert('プラン情報を保存しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          プラン制限管理

        </h2>

        <div className="mt-2 text-gray-500">

          OCR件数・利用人数・有効期限を自由に変更できます

        </div>

      </div>

      <div className="divide-y">

        {plans.map((plan, index) => (

          <div
            key={plan.plan}
            className="grid grid-cols-5 gap-5 p-6"
          >

            <div>

              <div className="font-bold">

                {plan.plan}

              </div>

            </div>

            <div>

              <label className="text-sm">

                OCR件数

              </label>

              <input
                type="number"
                className="mt-2 w-full rounded-lg border p-2"
                value={plan.maxOcr}
                onChange={(e) =>
                  update(
                    index,
                    'maxOcr',
                    Number(e.target.value),
                  )
                }
              />

            </div>

            <div>

              <label className="text-sm">

                利用人数

              </label>

              <input
                type="number"
                className="mt-2 w-full rounded-lg border p-2"
                value={plan.maxUsers}
                onChange={(e) =>
                  update(
                    index,
                    'maxUsers',
                    Number(e.target.value),
                  )
                }
              />

            </div>

            <div>

              <label className="text-sm">

                有効期限(日)

              </label>

              <input
                type="number"
                className="mt-2 w-full rounded-lg border p-2"
                value={plan.expireDays}
                onChange={(e) =>
                  update(
                    index,
                    'expireDays',
                    Number(e.target.value),
                  )
                }
              />

            </div>

            <div className="flex items-center justify-center">

              <input
                type="checkbox"
                checked={plan.active}
                onChange={(e) =>
                  update(
                    index,
                    'active',
                    e.target.checked,
                  )
                }
              />

            </div>

          </div>

        ))}

      </div>

      <div className="p-6">

        <button
          disabled={loading}
          onClick={save}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
        >
          {loading
            ? '保存中...'
            : 'プラン設定を保存'}
        </button>

      </div>

    </div>
  );
}