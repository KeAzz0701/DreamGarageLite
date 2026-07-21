// frontend/app/customer/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Vehicle = {
  id: number;
  registrationNumber: string;
  vin: string;
  carName: string;
  commonModelName: string;
  expirationDate: string;
};

type Customer = {
  id: number;
  customerName: string;
  customerAddress: string;
  phone: string;
  vehicles: Vehicle[];
};

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const data = await api<Customer[]>('/customer');
    setCustomers(data);
  }

  const filtered = customers.filter((c) => {
    const text =
      `${c.customerName} ${c.customerAddress} ${c.phone}`.toLowerCase();

    return text.includes(keyword.toLowerCase());
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="disp text-3xl">顧客管理</h1>

        <Link href="/" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      <input
        className="input mb-5"
        placeholder="顧客名・住所・電話番号"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      <div>
        {filtered.map((customer) => (
          <div key={customer.id} className="card">
            <div className="card-body">
              <div className="flex justify-between">
                <div>
                  <div className="cname disp text-xl">
                    {customer.customerName}
                  </div>

                  <div className="text-sm text-[var(--muted)]">
                    {customer.customerAddress}
                  </div>

                  <div className="text-sm text-[var(--muted)]">
                    {customer.phone || '-'}
                  </div>
                </div>

                <Link
                  href={`/customers/${customer.id}`}
                  className="btn btn-blue btn-sm h-fit"
                >
                  詳細
                </Link>
              </div>

              <hr className="my-4 border-[var(--line)]" />

              <div className="text-xs text-[var(--muted)] mb-2">
                所有車両
              </div>

              <div className="space-y-2">
                {customer.vehicles.map((v) => (
                  <div key={v.id} className="veh">
                    <div className="font-semibold">
                      {v.carName || '-'}
                      {v.commonModelName && (
                        <span className="ml-2 text-[var(--blue)]">
                          {v.commonModelName}
                        </span>
                      )}
                    </div>

                    <div>{v.registrationNumber}</div>

                    <div className="text-sm mono text-[var(--muted)]">
                      {v.vin}
                    </div>

                    <div className="text-sm">
                      車検満了：
                      {v.expirationDate || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}