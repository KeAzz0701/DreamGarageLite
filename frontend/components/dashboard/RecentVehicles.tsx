// frontend/components/dashboard/RecentVehicles.tsx

'use client';

import Link from 'next/link';
import { formatFlexibleDate } from '@/lib/japaneseDate';

interface Vehicle {
  id: number;
  registrationNumber: string;
  vin: string;
  carName: string;
  model: string;
  expirationDate: string;
  customer?: {
    customerName: string;
  };
}

interface Props {
  vehicles: Vehicle[];
}

export default function RecentVehicles({
  vehicles,
}: Props) {
  return (
    <div className="panel">
      <div className="sectionhead mt-0">
        <h3>最近登録した車両</h3>
        <Link href="/vehicle">一覧を見る →</Link>
      </div>

      {vehicles.length === 0 && (
        <div className="empty">車両データがありません</div>
      )}

      {vehicles.map((vehicle) => (
        <Link
          key={vehicle.id}
          href={`/vehicle/${vehicle.id}`}
          className="minirow"
        >
          <div className="l">
            <div>{vehicle.carName || '-'}</div>
            <div className="mono text-[var(--muted)]">
              {vehicle.registrationNumber}
            </div>
          </div>

          <div className="r text-right">
            <div className="font-semibold text-[var(--ink)]">
              {vehicle.customer?.customerName}
            </div>
            <div>{vehicle.model}</div>
            <div className="text-[var(--orange)]">
              車検：{formatFlexibleDate(vehicle.expirationDate) || '-'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
