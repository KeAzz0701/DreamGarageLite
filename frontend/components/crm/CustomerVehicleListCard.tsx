// frontend/components/crm/CustomerVehicleListCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Vehicle {
  id: number;

  plateNumber: string;

  maker: string;

  model: string;

  chassisNumber: string;

  firstRegistration: string;

  inspectionExpire: string;

  mileage: number;

  status:
    | '入庫中'
    | '予約'
    | '通常';
}

interface Props {
  customerId: number;
}

export default function CustomerVehicleListCard({
  customerId,
}: Props) {

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      `http://localhost:3001/api/customers/${customerId}/vehicles`,
    );

    if (!res.ok) return;

    setVehicles(await res.json());

  }

  function statusClass(status: string) {
    switch (status) {
      case '入庫中':
        return 'exp-ok';
      case '予約':
        return 'exp-warn';
      default:
        return '';
    }
  }

  return (
    <div className="panel">
      <div className="sectionhead mt-0">
        <div>
          <h3>登録車両</h3>
          <div className="mt-1 text-xs text-[var(--muted)]">顧客に紐づく車両一覧</div>
        </div>

        <button className="btn btn-blue btn-sm">車両追加</button>
      </div>

      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="veh">
          <div className="vehtop">
            <div className="vinfo">
              <div className="vname">{vehicle.plateNumber}</div>
              <div className="text-[var(--muted)]">
                {vehicle.maker} {vehicle.model}
              </div>
            </div>

            {statusClass(vehicle.status) ? (
              <span className={`expbadge ${statusClass(vehicle.status)}`}>
                {vehicle.status}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">{vehicle.status}</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <div className="text-[var(--muted)]">車台番号</div>
              <div className="mono">{vehicle.chassisNumber}</div>
            </div>

            <div>
              <div className="text-[var(--muted)]">初度登録</div>
              <div>{vehicle.firstRegistration}</div>
            </div>

            <div>
              <div className="text-[var(--muted)]">車検満了</div>
              <div>{vehicle.inspectionExpire}</div>
            </div>

            <div>
              <div className="text-[var(--muted)]">走行距離</div>
              <div className="mono">{vehicle.mileage.toLocaleString()} km</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-blue btn-sm">車両詳細</button>
            <button className="btn btn-dark btn-sm">整備履歴</button>
            <button className="btn btn-primary btn-sm">予約</button>
            <button className="btn btn-ghost btn-sm">OCR再登録</button>
          </div>
        </div>
      ))}

      {vehicles.length === 0 && (
        <div className="empty">登録車両はありません</div>
      )}
    </div>
  );

}
