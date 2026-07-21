// frontend/components/payment/ReceiptEditorCard.tsx

'use client';

import { useState } from 'react';

interface ReceiptData {
  invoiceNo: string;

  customerName: string;

  paymentDate: string;

  paymentMethod:
    | '現金'
    | 'クレジット'
    | '振込'
    | 'QR決済'
    | '電子マネー';

  amount: number;

  note: string;
}

export default function ReceiptEditorCard() {

  const [saving, setSaving] =
    useState(false);

  const [receipt, setReceipt] =
    useState<ReceiptData>({
      invoiceNo: '',
      customerName: '',
      paymentDate: new Date()
        .toISOString()
        .slice(0, 10),
      paymentMethod: '現金',
      amount: 0,
      note: '',
    });

  function update(
    key: keyof ReceiptData,
    value: any,
  ) {
    setReceipt({
      ...receipt,
      [key]: value,
    });
  }

  async function save() {
    setSaving(true);

    await fetch(
      'http://localhost:3001/api/receipts',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(receipt),
      },
    );

    setSaving(false);

    alert('領収書を保存しました');
  }

  async function issue() {
    await fetch(
      'http://localhost:3001/api/receipts/issue',
      {
        method: 'POST',
      },
    );

    alert('領収書を発行しました');
  }

  async function pdf() {
    window.open(
      'http://localhost:3001/api/receipts/pdf',
      '_blank',
    );
  }

  return (

    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          領収書発行

        </h2>

      </div>

      <div className="space-y-5 p-6">

        <input
          placeholder="請求書番号"
          className="w-full rounded-xl border p-3"
          value={receipt.invoiceNo}
          onChange={(e)=>
            update(
              'invoiceNo',
              e.target.value,
            )
          }
        />

        <input
          placeholder="宛名"
          className="w-full rounded-xl border p-3"
          value={receipt.customerName}
          onChange={(e)=>
            update(
              'customerName',
              e.target.value,
            )
          }
        />

        <input
          type="date"
          className="w-full rounded-xl border p-3"
          value={receipt.paymentDate}
          onChange={(e)=>
            update(
              'paymentDate',
              e.target.value,
            )
          }
        />

        <select
          className="w-full rounded-xl border p-3"
          value={receipt.paymentMethod}
          onChange={(e)=>
            update(
              'paymentMethod',
              e.target.value,
            )
          }
        >
          <option>現金</option>
          <option>クレジット</option>
          <option>振込</option>
          <option>QR決済</option>
          <option>電子マネー</option>
        </select>

        <input
          type="number"
          placeholder="受領金額"
          className="w-full rounded-xl border p-3"
          value={receipt.amount}
          onChange={(e)=>
            update(
              'amount',
              Number(e.target.value),
            )
          }
        />

        <textarea
          rows={4}
          placeholder="備考"
          className="w-full rounded-xl border p-3"
          value={receipt.note}
          onChange={(e)=>
            update(
              'note',
              e.target.value,
            )
          }
        />

        <div className="grid grid-cols-3 gap-4">

          <button
            disabled={saving}
            onClick={save}
            className="rounded-xl bg-blue-600 p-4 font-bold text-white"
          >
            {saving
              ? '保存中...'
              : '保存'}
          </button>

          <button
            onClick={issue}
            className="rounded-xl bg-orange-500 p-4 font-bold text-white"
          >
            発行
          </button>

          <button
            onClick={pdf}
            className="rounded-xl bg-green-600 p-4 font-bold text-white"
          >
            PDF
          </button>

        </div>

      </div>

    </div>

  );

}