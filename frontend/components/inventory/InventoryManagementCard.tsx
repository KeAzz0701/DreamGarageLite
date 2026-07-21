// frontend/components/inventory/InventoryManagementCard.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';

interface InventoryItem {
  id: number;

  partNumber: string;

  partName: string;

  manufacturer: string;

  category: string;

  stock: number;

  minimumStock: number;

  purchasePrice: number;

  sellingPrice: number;

  location: string;
}

export default function InventoryManagementCard() {

  const [items, setItems] =
    useState<InventoryItem[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      'http://localhost:3001/api/inventory',
    );

    if (!res.ok) return;

    setItems(await res.json());

  }

  async function order(id: number) {

    await fetch(
      `http://localhost:3001/api/inventory/${id}/order`,
      {
        method: 'POST',
      },
    );

    alert('発注書を作成しました');

  }

  const totalStockValue =
    useMemo(() => {

      return items.reduce(
        (sum, item) =>
          sum +
          item.purchasePrice *
            item.stock,
        0,
      );

    }, [items]);

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <div>

          <h2 className="text-2xl font-bold">

            部品在庫管理

          </h2>

          <div className="text-gray-500 mt-2">

            リアルタイム在庫管理

          </div>

        </div>

        <button
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >

          部品追加

        </button>

      </div>

      <div className="grid grid-cols-3 gap-5 border-b bg-slate-50 p-6">

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            登録部品数

          </div>

          <div className="mt-3 text-3xl font-bold">

            {items.length}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            在庫評価額

          </div>

          <div className="mt-3 text-3xl font-bold">

            ¥{totalStockValue.toLocaleString()}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            発注対象

          </div>

          <div className="mt-3 text-3xl font-bold text-red-600">

            {
              items.filter(
                x =>
                  x.stock <=
                  x.minimumStock,
              ).length
            }

          </div>

        </div>

      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-3">品番</th>
            <th className="p-3">部品名</th>
            <th className="p-3">メーカー</th>
            <th className="p-3">在庫</th>
            <th className="p-3">最低</th>
            <th className="p-3">仕入</th>
            <th className="p-3">販売</th>
            <th className="p-3">棚番</th>
            <th className="p-3"></th>

          </tr>

        </thead>

        <tbody>

          {items.map((item)=>(

            <tr
              key={item.id}
              className={`border-b ${
                item.stock <=
                item.minimumStock
                  ? 'bg-red-50'
                  : ''
              }`}
            >

              <td className="p-3">

                {item.partNumber}

              </td>

              <td className="p-3">

                {item.partName}

              </td>

              <td className="p-3">

                {item.manufacturer}

              </td>

              <td className="p-3 font-bold">

                {item.stock}

              </td>

              <td className="p-3">

                {item.minimumStock}

              </td>

              <td className="p-3">

                ¥{item.purchasePrice.toLocaleString()}

              </td>

              <td className="p-3">

                ¥{item.sellingPrice.toLocaleString()}

              </td>

              <td className="p-3">

                {item.location}

              </td>

              <td className="p-3">

                {item.stock <=
                item.minimumStock && (

                  <button
                    onClick={() =>
                      order(item.id)
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 text-white"
                  >

                    発注

                  </button>

                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}