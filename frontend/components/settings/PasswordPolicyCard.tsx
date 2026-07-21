// frontend/components/settings/PasswordPolicyCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface PasswordPolicy {
  password: string;

  maxAccounts: number;

  maxDevices: number;

  expiresInDays: number;

  unlimited: boolean;

  active: boolean;
}

export default function PasswordPolicyCard() {
  const [policies, setPolicies] =
    useState<PasswordPolicy[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      'http://localhost:3001/api/admin/password-policy',
    );

    if (!res.ok) return;

    setPolicies(await res.json());
  }

  function update(
    index: number,
    key: keyof PasswordPolicy,
    value: any,
  ) {
    const copy = [...policies];

    copy[index] = {
      ...copy[index],
      [key]: value,
    };

    setPolicies(copy);
  }

  async function save() {
    setLoading(true);

    await fetch(
      'http://localhost:3001/api/admin/password-policy',
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(policies),
      },
    );

    setLoading(false);

    alert('パスワードポリシーを保存しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          セットアップキー管理

        </h2>

        <div className="mt-2 text-gray-500">

          パスワード毎に利用可能アカウント数、
          利用期限、端末数を管理できます。

        </div>

      </div>

      <div className="divide-y">

        {policies.map((policy, index) => (

          <div
            key={index}
            className="grid grid-cols-6 gap-4 p-6"
          >

            <input
              className="rounded-lg border p-3 font-mono"
              value={policy.password}
              onChange={(e) =>
                update(
                  index,
                  'password',
                  e.target.value,
                )
              }
            />

            <input
              type="number"
              className="rounded-lg border p-3"
              value={policy.maxAccounts}
              onChange={(e) =>
                update(
                  index,
                  'maxAccounts',
                  Number(e.target.value),
                )
              }
            />

            <input
              type="number"
              className="rounded-lg border p-3"
              value={policy.maxDevices}
              onChange={(e) =>
                update(
                  index,
                  'maxDevices',
                  Number(e.target.value),
                )
              }
            />

            <input
              type="number"
              className="rounded-lg border p-3"
              value={policy.expiresInDays}
              onChange={(e) =>
                update(
                  index,
                  'expiresInDays',
                  Number(e.target.value),
                )
              }
            />

            <label className="flex items-center justify-center gap-2">

              <input
                type="checkbox"
                checked={policy.unlimited}
                onChange={(e) =>
                  update(
                    index,
                    'unlimited',
                    e.target.checked,
                  )
                }
              />

              無期限

            </label>

            <label className="flex items-center justify-center gap-2">

              <input
                type="checkbox"
                checked={policy.active}
                onChange={(e) =>
                  update(
                    index,
                    'active',
                    e.target.checked,
                  )
                }
              />

              有効

            </label>

          </div>

        ))}

      </div>

      <div className="p-6">

        <button
          disabled={loading}
          onClick={save}
          className="w-full rounded-xl bg-green-600 p-4 font-bold text-white"
        >
          {loading
            ? '保存中...'
            : 'ポリシーを保存'}
        </button>

      </div>

    </div>
  );
}