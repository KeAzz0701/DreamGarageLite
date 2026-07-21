// frontend/components/dashboard/SystemStatusCard.tsx

'use client';

interface Props {
  backend: boolean;
  database: boolean;
  gemini: boolean;
  version: string;
}

export default function SystemStatusCard({
  backend,
  database,
  gemini,
  version,
}: Props) {
  const Item = ({
    title,
    ok,
  }: {
    title: string;
    ok: boolean;
  }) => (
    <div className="flex items-center justify-between rounded border border-[var(--line)] p-3">
      <span className="text-sm font-medium">{title}</span>
      <span className={`expbadge ${ok ? 'exp-ok' : 'exp-danger'}`}>
        {ok ? '正常' : '異常'}
      </span>
    </div>
  );

  return (
    <div className="panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">システム状態</h3>
        <div className="mono rounded bg-[var(--ink)] px-3 py-1 text-xs font-bold text-white">
          v{version}
        </div>
      </div>

      <div className="space-y-3">
        <Item title="バックエンド" ok={backend} />
        <Item title="データベース" ok={database} />
        <Item title="Gemini API" ok={gemini} />
      </div>
    </div>
  );
}
