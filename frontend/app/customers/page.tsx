// frontend/app/customer/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlanLimits } from '@/lib/usePlanLimits';
import { PlanGatedLink } from '@/components/ui/PlanGatedLink';
import { normalizeForSearch } from '@/lib/kana';
import { formatFlexibleDate } from '@/lib/japaneseDate';

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
  customerNameReading: string | null;
  customerAddress: string;
  phone: string;
  lineUserId: string | null;
  vehicles: Vehicle[];
};

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [keyword, setKeyword] = useState('');
  const { limits } = usePlanLimits();
  const lineHistoryAllowed = limits ? limits.lineHistoryView : true;

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const data = await api<Customer[]>('/customer');
    setCustomers(data);
  }

  const filtered = customers.filter((c) => {
    const vehicleText = c.vehicles
      .map((v) => `${v.carName ?? ''} ${v.commonModelName ?? ''}`)
      .join(' ');

    const text = normalizeForSearch(
      `${c.customerName} ${c.customerNameReading ?? ''} ${c.customerAddress} ${c.phone} ${vehicleText}`,
    );

    return text.includes(normalizeForSearch(keyword));
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
        placeholder="顧客名・住所・電話番号・車両名"
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

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={customer.lineUserId ? 'badge-ok text-xs' : 'expbadge exp-warn text-xs'}
                  >
                    {customer.lineUserId ? '✅ LINE連携済み' : 'LINE未連携'}
                  </span>
                  <div className="flex gap-2">
                    <PlanGatedLink
                      allowed={lineHistoryAllowed}
                      href={`/customers/${customer.id}/line`}
                      className="btn btn-ghost btn-sm h-fit"
                      lockedMessage="LINEメッセージ履歴の閲覧はスタンダードプラン以上でご利用いただけます。"
                    >
                      💬 LINE
                    </PlanGatedLink>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="btn btn-blue btn-sm h-fit"
                    >
                      詳細
                    </Link>
                  </div>
                </div>
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
                      {formatFlexibleDate(v.expirationDate) || '-'}
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