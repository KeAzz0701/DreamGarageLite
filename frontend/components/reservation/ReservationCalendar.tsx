// frontend/components/reservation/ReservationCalendar.tsx

'use client';

import { useEffect, useState } from 'react';

interface Reservation {
  id: number;

  customerName: string;

  vehicleNumber: string;

  type:
    | '車検'
    | '点検'
    | 'オイル交換'
    | '修理'
    | '商談';

  start: string;

  end: string;

  staff: string;

  status:
    | '予約'
    | '受付'
    | '作業中'
    | '完了'
    | 'キャンセル';
}

export default function ReservationCalendar() {
  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const res = await fetch(
      'http://localhost:3001/api/reservations',
    );

    if (res.ok) {
      setReservations(await res.json());
    }

    setLoading(false);
  }

  function color(type: string) {
    switch (type) {
      case '車検':
        return 'bg-red-100';

      case '点検':
        return 'bg-blue-100';

      case '修理':
        return 'bg-yellow-100';

      case 'オイル交換':
        return 'bg-green-100';

      default:
        return 'bg-gray-100';
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <div>

          <h2 className="text-2xl font-bold">
            予約管理
          </h2>

          <div className="mt-2 text-gray-500">
            Googleカレンダーと同期
          </div>

        </div>

        <button
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >
          新規予約
        </button>

      </div>

      <div className="divide-y">

        {reservations.map((item) => (

          <div
            key={item.id}
            className={`flex items-center justify-between p-5 ${color(
              item.type,
            )}`}
          >

            <div>

              <div className="font-bold">

                {item.customerName}

              </div>

              <div className="text-sm text-gray-500">

                {item.vehicleNumber}

              </div>

            </div>

            <div>

              <div className="font-bold">

                {item.type}

              </div>

              <div className="text-sm">

                {item.start}

              </div>

            </div>

            <div>

              {item.staff}

            </div>

            <div>

              <span className="rounded-lg bg-white px-3 py-1">

                {item.status}

              </span>

            </div>

          </div>

        ))}

        {!loading &&
          reservations.length === 0 && (

            <div className="p-10 text-center text-gray-400">

              予約はありません

            </div>

          )}

      </div>

    </div>
  );
}