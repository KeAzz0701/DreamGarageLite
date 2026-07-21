// frontend/components/settings/PlanManagementCard.tsx

'use client';

import { useState } from 'react';

interface PlanInfo {
  plan: 'FREE' | 'LITE' | 'STANDARD' | 'PRO';

  usedAccounts: number;
  maxAccounts: number;

  usedOcr: number;
  maxOcr: number;

  expireAt?: string | null;
}

interface Props {
  plan: PlanInfo;
  onReload(): void;
}

export default function PlanManagementCard({
  plan,
  onReload,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  async function syncPlan() {
    setLoading(true);

    try {
      await fetch(
        'http://localhost:3001/api/license/sync',
        {
          method: 'POST',
        },
      );

      onReload();

      alert('ライセンス情報を更新しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          プラン管理

        </h2>

      </div>

      <div className="space-y-6 p-6">

        <div className="flex justify-between">

          <span>契約プラン</span>

          <span className="font-bold">

            {plan.plan}

          </span>

        </div>

        <div>

          <div className="mb-2 flex justify-between">

            <span>利用アカウント</span>

            <span>

              {plan.usedAccounts}/

              {plan.maxAccounts === 9999
                ? '∞'
                : plan.maxAccounts}

            </span>

          </div>

          <div className="h-3 rounded-full bg-gray-200">

            <div
              className="h-3 rounded-full bg-blue-600"
              style={{
                width: `${
                  (plan.usedAccounts /
                    plan.maxAccounts) *
                  100
                }%`,
              }}
            />

          </div>

        </div>

        <div>

          <div className="mb-2 flex justify-between">

            <span>OCR利用数</span>

            <span>

              {plan.usedOcr}/

              {plan.maxOcr === -1
                ? '∞'
                : plan.maxOcr}

            </span>

          </div>

          {plan.maxOcr !== -1 && (

            <div className="h-3 rounded-full bg-gray-200">

              <div
                className="h-3 rounded-full bg-green-600"
                style={{
                  width: `${
                    (plan.usedOcr /
                      plan.maxOcr) *
                    100
                  }%`,
                }}
              />

            </div>

          )}

        </div>

        <div className="flex justify-between">

          <span>有効期限</span>

          <span>

            {plan.expireAt ?? '無期限'}

          </span>

        </div>

        <button
          disabled={loading}
          onClick={syncPlan}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
        >
          {loading
            ? '同期中...'
            : 'ライセンス同期'}
        </button>

      </div>

    </div>
  );
}