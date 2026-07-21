// frontend/components/service/ServiceWorkOrderCard.tsx

'use client';

import { useState } from 'react';

interface WorkItem {
  id: number;

  category: string;

  itemName: string;

  quantity: number;

  unitPrice: number;

  laborTime: number;

  laborFee: number;
}

export default function ServiceWorkOrderCard() {
  const [items, setItems] =
    useState<WorkItem[]>([]);

  const [saving, setSaving] =
    useState(false);

  function addItem() {
    setItems([
      ...items,
      {
        id: Date.now(),
        category: '',
        itemName: '',
        quantity: 1,
        unitPrice: 0,
        laborTime: 0,
        laborFee: 0,
      },
    ]);
  }

  function update(
    id: number,
    key: keyof WorkItem,
    value: any,
  ) {
    setItems((list) =>
      list.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  async function save() {
    setSaving(true);

    await fetch(
      'http://localhost:3001/api/service/work-order',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(items),
      },
    );

    setSaving(false);

    alert('整備明細を保存しました');
  }

  const total = items.reduce(
    (sum, item) =>
      sum +
      item.quantity * item.unitPrice +
      item.laborFee,
    0,
  );

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <h2 className="text-2xl font-bold">

          整備明細

        </h2>

        <button
          onClick={addItem}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >
          明細追加
        </button>

      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-3">分類</th>
            <th className="p-3">部品・作業名</th>
            <th className="p-3">数量</th>
            <th className="p-3">単価</th>
            <th className="p-3">工数(h)</th>
            <th className="p-3">工賃</th>
            <th className="p-3">金額</th>

          </tr>

        </thead>

        <tbody>

          {items.map((item) => {

            const amount =
              item.quantity *
                item.unitPrice +
              item.laborFee;

            return (

              <tr
                key={item.id}
                className="border-b"
              >

                <td className="p-2">

                  <input
                    className="w-full rounded border p-2"
                    value={item.category}
                    onChange={(e)=>
                      update(
                        item.id,
                        'category',
                        e.target.value,
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    className="w-full rounded border p-2"
                    value={item.itemName}
                    onChange={(e)=>
                      update(
                        item.id,
                        'itemName',
                        e.target.value,
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.quantity}
                    onChange={(e)=>
                      update(
                        item.id,
                        'quantity',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.unitPrice}
                    onChange={(e)=>
                      update(
                        item.id,
                        'unitPrice',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    step="0.5"
                    className="w-full rounded border p-2"
                    value={item.laborTime}
                    onChange={(e)=>
                      update(
                        item.id,
                        'laborTime',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.laborFee}
                    onChange={(e)=>
                      update(
                        item.id,
                        'laborFee',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-3 font-bold">

                  ¥{amount.toLocaleString()}

                </td>

              </tr>

            );

          })}

        </tbody>

      </table>

      <div className="border-t bg-slate-50 p-6">

        <div className="flex justify-end">

          <div className="text-right">

            <div className="text-gray-500">

              合計金額

            </div>

            <div className="text-3xl font-bold">

              ¥{total.toLocaleString()}

            </div>

          </div>

        </div>

        <button
          disabled={saving}
          onClick={save}
          className="mt-6 w-full rounded-xl bg-green-600 p-4 font-bold text-white"
        >
          {saving
            ? '保存中...'
            : '整備明細を保存'}
        </button>

      </div>

    </div>
  );
}