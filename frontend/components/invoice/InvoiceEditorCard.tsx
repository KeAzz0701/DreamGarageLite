// frontend/components/invoice/InvoiceEditorCard.tsx

'use client';

import { useMemo, useState } from 'react';

interface InvoiceItem {
  id: number;

  name: string;

  qty: number;

  price: number;

  labor: number;
}

export default function InvoiceEditorCard() {
  const [items, setItems] =
    useState<InvoiceItem[]>([]);

  const [discount, setDiscount] =
    useState(0);

  const taxRate = 0.1;

  function addItem() {
    setItems([
      ...items,
      {
        id: Date.now(),
        name: '',
        qty: 1,
        price: 0,
        labor: 0,
      },
    ]);
  }

  function update(
    id: number,
    key: keyof InvoiceItem,
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

  const subtotal = useMemo(() => {

    return items.reduce(
      (sum, item) =>
        sum +
        item.qty * item.price +
        item.labor,
      0,
    );

  }, [items]);

  const tax = Math.floor(
    (subtotal - discount) * taxRate,
  );

  const total =
    subtotal - discount + tax;

  async function saveInvoice() {

    await fetch(
      'http://localhost:3001/api/invoices',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          items,
          subtotal,
          discount,
          tax,
          total,
        }),
      },
    );

    alert('請求書を保存しました');

  }

  async function issue() {

    await fetch(
      'http://localhost:3001/api/invoices/issue',
      {
        method: 'POST',
      },
    );

    alert('請求書を発行しました');

  }

  async function pdf() {

    window.open(
      'http://localhost:3001/api/invoices/pdf',
      '_blank',
    );

  }

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="flex items-center justify-between border-b p-6">

        <h2 className="text-2xl font-bold">

          請求書

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

            <th className="p-3">

              内容

            </th>

            <th className="p-3">

              数量

            </th>

            <th className="p-3">

              単価

            </th>

            <th className="p-3">

              工賃

            </th>

            <th className="p-3">

              金額

            </th>

          </tr>

        </thead>

        <tbody>

          {items.map((item)=>{

            const amount =
              item.qty *
                item.price +
              item.labor;

            return(

              <tr
                key={item.id}
                className="border-b"
              >

                <td className="p-2">

                  <input
                    className="w-full rounded border p-2"
                    value={item.name}
                    onChange={(e)=>
                      update(
                        item.id,
                        'name',
                        e.target.value,
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.qty}
                    onChange={(e)=>
                      update(
                        item.id,
                        'qty',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.price}
                    onChange={(e)=>
                      update(
                        item.id,
                        'price',
                        Number(e.target.value),
                      )
                    }
                  />

                </td>

                <td className="p-2">

                  <input
                    type="number"
                    className="w-full rounded border p-2"
                    value={item.labor}
                    onChange={(e)=>
                      update(
                        item.id,
                        'labor',
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

        <div className="ml-auto w-80 space-y-3">

          <div className="flex justify-between">

            <span>小計</span>

            <b>

              ¥{subtotal.toLocaleString()}

            </b>

          </div>

          <div className="flex justify-between">

            <span>値引き</span>

            <input
              type="number"
              className="w-32 rounded border p-2 text-right"
              value={discount}
              onChange={(e)=>
                setDiscount(
                  Number(e.target.value),
                )
              }
            />

          </div>

          <div className="flex justify-between">

            <span>消費税</span>

            <b>

              ¥{tax.toLocaleString()}

            </b>

          </div>

          <div className="flex justify-between text-3xl font-bold">

            <span>請求額</span>

            <span>

              ¥{total.toLocaleString()}

            </span>

          </div>

        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">

          <button
            onClick={saveInvoice}
            className="rounded-xl bg-blue-600 p-4 font-bold text-white"
          >

            保存

          </button>

          <button
            onClick={issue}
            className="rounded-xl bg-orange-500 p-4 font-bold text-white"
          >

            請求確定

          </button>

          <button
            onClick={pdf}
            className="rounded-xl bg-green-600 p-4 font-bold text-white"
          >

            PDF発行

          </button>

        </div>

      </div>

    </div>

  );

}