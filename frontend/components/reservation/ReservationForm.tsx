// frontend/components/reservation/ReservationForm.tsx

'use client';

import { useState } from 'react';

interface ReservationForm {
  customerId: number;

  vehicleId: number;

  reservationType:
    | '車検'
    | '点検'
    | '修理'
    | 'オイル交換'
    | '商談';

  startAt: string;

  endAt: string;

  staffId: number;

  memo: string;

  googleSync: boolean;

  lineNotify: boolean;

  smsNotify: boolean;

  emailNotify: boolean;
}

export default function ReservationForm() {
  const [saving, setSaving] =
    useState(false);

  const [form, setForm] =
    useState<ReservationForm>({
      customerId: 0,
      vehicleId: 0,
      reservationType: '車検',
      startAt: '',
      endAt: '',
      staffId: 0,
      memo: '',
      googleSync: true,
      lineNotify: true,
      smsNotify: false,
      emailNotify: true,
    });

  function update(
    key: keyof ReservationForm,
    value: any,
  ) {
    setForm({
      ...form,
      [key]: value,
    });
  }

  async function save() {
    setSaving(true);

    await fetch(
      'http://localhost:3001/api/reservations',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(form),
      },
    );

    setSaving(false);

    alert('予約を登録しました');
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">

          新規予約

        </h2>

      </div>

      <div className="space-y-5 p-6">

        <input
          type="number"
          placeholder="顧客ID"
          className="w-full rounded-xl border p-3"
          value={form.customerId}
          onChange={(e)=>
            update(
              'customerId',
              Number(e.target.value),
            )
          }
        />

        <input
          type="number"
          placeholder="車両ID"
          className="w-full rounded-xl border p-3"
          value={form.vehicleId}
          onChange={(e)=>
            update(
              'vehicleId',
              Number(e.target.value),
            )
          }
        />

        <select
          className="w-full rounded-xl border p-3"
          value={form.reservationType}
          onChange={(e)=>
            update(
              'reservationType',
              e.target.value,
            )
          }
        >
          <option>車検</option>
          <option>点検</option>
          <option>修理</option>
          <option>オイル交換</option>
          <option>商談</option>
        </select>

        <input
          type="datetime-local"
          className="w-full rounded-xl border p-3"
          value={form.startAt}
          onChange={(e)=>
            update(
              'startAt',
              e.target.value,
            )
          }
        />

        <input
          type="datetime-local"
          className="w-full rounded-xl border p-3"
          value={form.endAt}
          onChange={(e)=>
            update(
              'endAt',
              e.target.value,
            )
          }
        />

        <input
          type="number"
          placeholder="担当スタッフID"
          className="w-full rounded-xl border p-3"
          value={form.staffId}
          onChange={(e)=>
            update(
              'staffId',
              Number(e.target.value),
            )
          }
        />

        <textarea
          rows={4}
          placeholder="作業内容・備考"
          className="w-full rounded-xl border p-3"
          value={form.memo}
          onChange={(e)=>
            update(
              'memo',
              e.target.value,
            )
          }
        />

        <div className="grid grid-cols-2 gap-4">

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.googleSync}
              onChange={(e)=>
                update(
                  'googleSync',
                  e.target.checked,
                )
              }
            />
            Google同期
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.lineNotify}
              onChange={(e)=>
                update(
                  'lineNotify',
                  e.target.checked,
                )
              }
            />
            LINE通知
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.smsNotify}
              onChange={(e)=>
                update(
                  'smsNotify',
                  e.target.checked,
                )
              }
            />
            SMS通知
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.emailNotify}
              onChange={(e)=>
                update(
                  'emailNotify',
                  e.target.checked,
                )
              }
            />
            メール通知
          </label>

        </div>

        <button
          disabled={saving}
          onClick={save}
          className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white"
        >
          {saving
            ? '登録中...'
            : '予約を登録'}
        </button>

      </div>

    </div>
  );
}