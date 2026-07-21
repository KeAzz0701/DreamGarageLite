// frontend/components/dashboard/WelcomeCard.tsx

'use client';

interface Props {
  companyName: string;
  customerCount: number;
  vehicleCount: number;
}

export default function WelcomeCard({
  companyName,
  customerCount,
  vehicleCount,
}: Props) {
  return (
    <div
      className="overflow-hidden rounded text-white shadow-md"
      style={{ background: 'var(--asphalt)', borderBottom: '3px solid var(--orange)' }}
    >
      <div className="p-8">
        <div className="text-sm opacity-70">ようこそ</div>

        <h1 className="disp mt-2 text-3xl">{companyName}</h1>

        <p className="mt-2 text-sm opacity-80">
          AI車検証OCR・顧客管理・車両管理システム
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded bg-white/10 p-4">
            <div className="text-xs opacity-80">顧客登録数</div>
            <div className="mono mt-1 text-3xl font-bold">{customerCount}</div>
          </div>

          <div className="rounded bg-white/10 p-4">
            <div className="text-xs opacity-80">車両登録数</div>
            <div className="mono mt-1 text-3xl font-bold">{vehicleCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
