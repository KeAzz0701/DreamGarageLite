// frontend/components/payment/PaymentManagementCard.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';

interface Payment {

  id: number;

  invoiceNo: string;

  customer: string;

  invoiceDate: string;

  dueDate: string;

  amount: number;

  paidAmount: number;

  paymentMethod: string;

  status:
    | '未入金'
    | '一部入金'
    | '入金済';

}

export default function PaymentManagementCard() {

  const [payments, setPayments] =
    useState<Payment[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      'http://localhost:3001/api/payments',
    );

    if (!res.ok) return;

    setPayments(await res.json());

  }

  async function receive(id: number) {

    await fetch(
      `http://localhost:3001/api/payments/${id}/receive`,
      {
        method: 'POST',
      },
    );

    load();

  }

  const totalInvoice = useMemo(
    () =>
      payments.reduce(
        (a, b) => a + b.amount,
        0,
      ),
    [payments],
  );

  const totalPaid = useMemo(
    () =>
      payments.reduce(
        (a, b) => a + b.paidAmount,
        0,
      ),
    [payments],
  );

  const totalUnpaid =
    totalInvoice - totalPaid;

  function badge(status: string) {

    switch (status) {

      case '入金済':
        return 'bg-green-100 text-green-700';

      case '一部入金':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-red-100 text-red-700';

    }

  }

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          入金管理

        </h2>

      </div>

      <div className="grid grid-cols-3 gap-5 border-b bg-slate-50 p-6">

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            請求総額

          </div>

          <div className="mt-3 text-3xl font-bold">

            ¥{totalInvoice.toLocaleString()}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            入金済

          </div>

          <div className="mt-3 text-3xl font-bold text-green-600">

            ¥{totalPaid.toLocaleString()}

          </div>

        </div>

        <div className="rounded-xl bg-white p-5 shadow">

          <div className="text-gray-500">

            未回収

          </div>

          <div className="mt-3 text-3xl font-bold text-red-600">

            ¥{totalUnpaid.toLocaleString()}

          </div>

        </div>

      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-3">請求番号</th>
            <th className="p-3">顧客</th>
            <th className="p-3">請求日</th>
            <th className="p-3">支払期限</th>
            <th className="p-3">請求額</th>
            <th className="p-3">入金額</th>
            <th className="p-3">状態</th>
            <th className="p-3"></th>

          </tr>

        </thead>

        <tbody>

          {payments.map((item)=>(

            <tr
              key={item.id}
              className="border-b hover:bg-slate-50"
            >

              <td className="p-3">

                {item.invoiceNo}

              </td>

              <td className="p-3">

                {item.customer}

              </td>

              <td className="p-3">

                {item.invoiceDate}

              </td>

              <td className="p-3">

                {item.dueDate}

              </td>

              <td className="p-3 font-bold">

                ¥{item.amount.toLocaleString()}

              </td>

              <td className="p-3">

                ¥{item.paidAmount.toLocaleString()}

              </td>

              <td className="p-3">

                <span
                  className={`rounded-lg px-3 py-1 ${badge(item.status)}`}
                >

                  {item.status}

                </span>

              </td>

              <td className="p-3">

                <button
                  onClick={() =>
                    receive(item.id)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                >

                  入金登録

                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}