// frontend/components/dashboard/OcrUsageCard.tsx

'use client';

interface Props {
  plan: string;
  used: number;
  limit: number;
}

export default function OcrUsageCard({
  plan,
  used,
  limit,
}: Props) {
  const unlimited = limit === -1;

  const percent = unlimited
    ? 100
    : Math.min((used / limit) * 100, 100);

  const barColor =
    percent >= 90
      ? 'var(--danger)'
      : percent >= 70
        ? 'var(--yellow)'
        : 'var(--ok)';

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--muted)]">📷 OCR利用状況</div>
          <div className="mono mt-1 text-2xl font-bold">
            {unlimited ? '∞' : `${used}/${limit}`}
          </div>
        </div>

        <div className="btn btn-blue btn-sm">{plan}</div>
      </div>

      {!unlimited && (
        <>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--paper-dim)]">
            <div
              className="h-full transition-all"
              style={{ width: `${percent}%`, background: barColor }}
            />
          </div>

          <div className="mt-2 text-right text-xs text-[var(--muted)]">
            残り {limit - used} 件
          </div>
        </>
      )}

      {unlimited && (
        <div className="empty mt-4 text-[var(--ok)]">OCR無制限プラン</div>
      )}
    </div>
  );
}
