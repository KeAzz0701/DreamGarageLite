// frontend/components/purchase/PurchaseOrderManagementCard.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';

interface PurchaseOrder {
  id: number;

  orderNo: string;

  supplier: string;

  orderDate: string;

  expectedDate: string;

  totalAmount: number;

  status:
    | '下書き'
    | '発注済'
    | '一部入荷'
    | '入荷完了'
    | 'キャンセル';
}

export default function PurchaseOrderManagementCard() {

  const [orders, setOrders] =
    useState<PurchaseOrder[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      'http://localhost:3001/api/purchase-orders',
    );

    if (!res.ok) return;

    setOrders(await res.json());

  }

  async function createOrder() {

    await fetch(
      'http://localhost:3001/api/purchase-orders',
      {
        method: 'POST',
      },
    );

    load();

  }

  async function receive(id: number) {

    await fetch(
      `http://localhost:3001/api/purchase-orders/${id}/receive`,
      {
        method: 'POST',
      },
    );

    load();

  }

  async function pdf(id: number) {

    window.open(
      `http://localhost:3001/api/purchase-orders/${id}/pdf`,
      '_blank',
    );

  }

  const totalPurchase =
    useMemo(() => {

      return orders.reduce(
        (sum, item) =>
          sum + item.totalAmount,
        0,
      );

    }, [orders]);

  function badge(status: string) {

    switch (status) {

      case '入荷完了':
        return 'bg-green-100 text-green-700';

      case '一部入荷':
        return 'bg-yellow-100 text-yellow-700';

      case '発注済':
        return 'bg-blue-100 text-blue-700';

      default:
        return 'bg-slate-100';

    }

  }

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <div>

          <h2 className="text-2xl font-bold">

            発注管理

          </h2>

          <div className="mt-2 text-gray-500">

            部品・用品・消耗品の発注管理

          </div>

        </div>

        <button
          onClick={createOrder}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >

          新規発注

        </button>

      </div>

      <div className="grid grid-cols-3 gap-5 border-b bg-slate-50 p-6">

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            発注件数

          </div>

          <div className="mt-3 text-3xl font-bold">

            {orders.length}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            発注金額

          </div>

          <div className="mt-3 text-3xl font-bold">

            ¥{totalPurchase.toLocaleString()}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            未入荷

          </div>

          <div className="mt-3 text-3xl font-bold text-red-600">

            {
              orders.filter(
                x => x.status !== '入荷完了',
              ).length
            }

          </div>

        </div>

      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-3">発注番号</th>
            <th className="p-3">仕入先</th>
            <th className="p-3">発注日</th>
            <th className="p-3">入荷予定</th>
            <th className="p-3">金額</th>
            <th className="p-3">状態</th>
            <th className="p-3"></th>

          </tr>

        </thead>

        <tbody>

          {orders.map((item)=>(

            <tr
              key={item.id}
              className="border-b hover:bg-slate-50"
            >

              <td className="p-3">

                {item.orderNo}

              </td>

              <td className="p-3">

                {item.supplier}

              </td>

              <td className="p-3">

                {item.orderDate}

              </td>

              <td className="p-3">

                {item.expectedDate}

              </td>

              <td className="p-3 font-bold">

                ¥{item.totalAmount.toLocaleString()}

              </td>

              <td className="p-3">

                <span
                  className={`rounded-lg px-3 py-1 ${badge(item.status)}`}
                >

                  {item.status}

                </span>

              </td>

              <td className="p-3">

                <div className="flex gap-2">

                  <button
                    onClick={() =>
                      receive(item.id)
                    }
                    className="rounded-lg bg-green-600 px-3 py-2 text-white"
                  >

                    入荷

                  </button>

                  <button
                    onClick={() =>
                      pdf(item.id)
                    }
                    className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                  >

                    PDF

                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}