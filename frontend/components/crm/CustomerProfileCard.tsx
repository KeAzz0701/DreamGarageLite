// frontend/components/crm/CustomerProfileCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Customer {
  id: number;

  name: string;

  kana: string;

  phone: string;

  mobile: string;

  email: string;

  address: string;

  birthday: string;

  rank:
    | 'S'
    | 'A'
    | 'B'
    | 'C';

  memo: string;

  totalVehicles: number;

  totalSales: number;

  lastVisit: string;
}

interface Props {
  customerId: number;
}

export default function CustomerProfileCard({
  customerId,
}: Props) {

  const [customer, setCustomer] =
    useState<Customer>();

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const res = await fetch(
      `http://localhost:3001/api/customers/${customerId}`,
    );

    if (!res.ok) return;

    setCustomer(await res.json());

  }

  async function save() {

    if (!customer) return;

    setLoading(true);

    await fetch(
      `http://localhost:3001/api/customers/${customer.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(customer),
      },
    );

    setLoading(false);

    alert('顧客情報を保存しました');

  }

  function update(
    key: keyof Customer,
    value: any,
  ) {

    if (!customer) return;

    setCustomer({
      ...customer,
      [key]: value,
    });

  }

  if (!customer) return null;

  return (
    <div className="panel">
      <h2 className="disp text-xl">顧客カルテ</h2>

      <div className="mt-5 space-y-4">
        <input
          className="input"
          placeholder="氏名"
          value={customer.name}
          onChange={(e) => update('name', e.target.value)}
        />

        <input
          className="input"
          placeholder="フリガナ"
          value={customer.kana}
          onChange={(e) => update('kana', e.target.value)}
        />

        <div className="grid2">
          <input
            className="input"
            placeholder="電話番号"
            value={customer.phone}
            onChange={(e) => update('phone', e.target.value)}
          />

          <input
            className="input"
            placeholder="携帯番号"
            value={customer.mobile}
            onChange={(e) => update('mobile', e.target.value)}
          />
        </div>

        <input
          className="input"
          placeholder="メール"
          value={customer.email}
          onChange={(e) => update('email', e.target.value)}
        />

        <textarea
          rows={3}
          className="input"
          placeholder="住所"
          value={customer.address}
          onChange={(e) => update('address', e.target.value)}
        />

        <textarea
          rows={5}
          className="input"
          placeholder="メモ"
          value={customer.memo}
          onChange={(e) => update('memo', e.target.value)}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="statcard">
            <div className="num mono">{customer.totalVehicles}</div>
            <div className="lbl">登録車両</div>
          </div>

          <div className="statcard">
            <div className="num mono">¥{customer.totalSales.toLocaleString()}</div>
            <div className="lbl">売上</div>
          </div>

          <div className="statcard">
            <div className="num mono">{customer.rank}</div>
            <div className="lbl">ランク</div>
          </div>
        </div>

        <button disabled={loading} onClick={save} className="btn btn-primary w-full justify-center">
          {loading ? '保存中...' : '顧客情報を保存'}
        </button>
      </div>
    </div>
  );

}
