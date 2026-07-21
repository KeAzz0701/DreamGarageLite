// frontend/components/service/ServiceHistoryCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface ServiceHistory {
  id: number;

  visitDate: string;

  category:
    | '車検'
    | '12ヶ月点検'
    | '6ヶ月点検'
    | '修理'
    | 'オイル交換'
    | 'タイヤ交換'
    | 'その他';

  mileage: number;

  mechanic: string;

  totalAmount: number;

  status:
    | '受付'
    | '作業中'
    | '完了';

  invoiceNo: string;
}

interface Props {
  vehicleId: number;
}

export default function ServiceHistoryCard({
  vehicleId,
}: Props) {

  const [histories, setHistories] =
    useState<ServiceHistory[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      `http://localhost:3001/api/vehicles/${vehicleId}/services`,
    );

    if (!res.ok) return;

    setHistories(await res.json());

  }

  function badge(status: string) {

    switch (status) {

      case '完了':
        return 'bg-green-100 text-green-700';

      case '作業中':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-blue-100 text-blue-700';

    }

  }

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <div>

          <h2 className="text-2xl font-bold">

            整備履歴

          </h2>

          <div className="mt-2 text-gray-500">

            この車両の整備履歴一覧

          </div>

        </div>

        <button
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >

          整備登録

        </button>

      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-4 text-left">

              日付

            </th>

            <th className="p-4 text-left">

              作業

            </th>

            <th className="p-4 text-left">

              距離

            </th>

            <th className="p-4 text-left">

              担当

            </th>

            <th className="p-4 text-left">

              金額

            </th>

            <th className="p-4 text-left">

              状態

            </th>

            <th className="p-4 text-left">

            </th>

          </tr>

        </thead>

        <tbody>

          {histories.map((item)=>(

            <tr
              key={item.id}
              className="border-b hover:bg-slate-50"
            >

              <td className="p-4">

                {item.visitDate}

              </td>

              <td className="p-4">

                {item.category}

              </td>

              <td className="p-4">

                {item.mileage.toLocaleString()} km

              </td>

              <td className="p-4">

                {item.mechanic}

              </td>

              <td className="p-4 font-bold">

                ¥{item.totalAmount.toLocaleString()}

              </td>

              <td className="p-4">

                <span
                  className={`rounded-lg px-3 py-1 ${badge(item.status)}`}
                >

                  {item.status}

                </span>

              </td>

              <td className="p-4">

                <div className="flex gap-2">

                  <button className="rounded bg-blue-600 px-3 py-2 text-white">

                    詳細

                  </button>

                  <button className="rounded bg-green-600 px-3 py-2 text-white">

                    請求書

                  </button>

                  <button className="rounded bg-orange-500 px-3 py-2 text-white">

                    PDF

                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

      {histories.length===0 && (

        <div className="p-10 text-center text-gray-400">

          整備履歴はありません

        </div>

      )}

    </div>

  );

}