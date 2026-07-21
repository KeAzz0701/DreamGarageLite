// frontend/components/dashboard/ExpirationAlertCard.tsx

'use client';

import Link from 'next/link';

interface Vehicle {
  id: number;
  registrationNumber: string;
  carName: string;
  customer?: {
    customerName: string;
  };
  expirationDate: string | null;
}

interface Props {
  vehicles: Vehicle[];
}

function calcRemain(date?: string | null) {
  if (!date) return null;

  const target = new Date(date);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

export default function ExpirationAlertCard({
  vehicles,
}: Props) {
  const list = vehicles
    .map((v) => ({
      ...v,
      remain: calcRemain(v.expirationDate),
    }))
    .filter(
      (v) =>
        v.remain !== null &&
        v.remain <= 90,
    )
    .sort(
      (a, b) =>
        (a.remain ?? 9999) -
        (b.remain ?? 9999),
    );

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold">🛠 車検満了アラート</h3>
      <div className="mt-1 text-xs text-[var(--muted)]">90日以内</div>

      {list.length === 0 && (
        <div className="empty mt-3 text-[var(--ok)]">
          90日以内の車検満了車両はありません
        </div>
      )}

      {list.map((vehicle) => {
        const cls =
          (vehicle.remain ?? 0) <= 30
            ? 'exp-danger'
            : (vehicle.remain ?? 0) <= 60
              ? 'exp-warn'
              : 'exp-ok';

        return (
          <Link
            key={vehicle.id}
            href={`/vehicle/${vehicle.id}`}
            className="minirow"
          >
            <div className="l">
              <div className="font-semibold text-[var(--ink)]">
                {vehicle.carName}
              </div>
              <div className="text-[var(--muted)]">
                {vehicle.registrationNumber} ・ {vehicle.customer?.customerName}
              </div>
            </div>

            <span className={`expbadge ${cls}`}>残り {vehicle.remain} 日</span>
          </Link>
        );
      })}
    </div>
  );
}
