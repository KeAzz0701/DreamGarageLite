// frontend/components/dashboard/RecentCustomers.tsx

'use client';

import Link from 'next/link';

interface Customer {
  id: number;
  customerName: string;
  customerAddress: string;
  phone: string;
  vehicles: {
    id: number;
  }[];
}

interface Props {
  customers: Customer[];
}

export default function RecentCustomers({
  customers,
}: Props) {
  return (
    <div className="panel">
      <div className="sectionhead mt-0">
        <h3>最近登録した顧客</h3>
        <Link href="/customers">一覧を見る →</Link>
      </div>

      {customers.length === 0 && (
        <div className="empty">顧客データがありません</div>
      )}

      {customers.map((customer) => (
        <Link
          key={customer.id}
          href={`/customers/${customer.id}`}
          className="minirow"
        >
          <div className="l">
            <div>{customer.customerName}</div>
            <div className="text-[var(--muted)]">
              {customer.customerAddress}
            </div>
          </div>

          <div className="r text-right">
            <div>登録車両</div>
            <div className="mono font-bold text-[var(--blue)]">
              {customer.vehicles.length}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
