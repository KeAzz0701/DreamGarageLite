// frontend/components/dashboard/LicenseCard.tsx

'use client';

interface Props {
  plan: 'FREE' | 'LITE' | 'STANDARD' | 'PRO';
  status: string;
  expireAt?: string | null;
  maxUsers: number;
}

const colors = {
  FREE: 'var(--muted)',
  LITE: 'var(--blue)',
  STANDARD: 'var(--ok)',
  PRO: 'var(--orange)',
};

export default function LicenseCard({
  plan,
  status,
  expireAt,
  maxUsers,
}: Props) {
  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--muted)]">ライセンス</div>
          <div className="disp mt-1 text-2xl">{plan}</div>
        </div>

        <div
          className="rounded px-4 py-2 font-bold text-white"
          style={{ background: colors[plan] }}
        >
          {plan}
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">ステータス</span>
          <span className="font-semibold">{status}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">最大ユーザー数</span>
          <span className="font-semibold">
            {maxUsers === 9999 ? '無制限' : `${maxUsers}人`}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--muted)]">有効期限</span>
          <span className="font-semibold">{expireAt ?? '無期限'}</span>
        </div>
      </div>
    </div>
  );
}
