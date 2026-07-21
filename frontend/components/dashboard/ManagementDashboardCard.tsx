// frontend/components/dashboard/ManagementDashboardCard.tsx

'use client';

import { useEffect, useState } from 'react';

interface Dashboard {

  todaySales: number;

  monthSales: number;

  monthProfit: number;

  vehiclesInShop: number;

  reservationsToday: number;

  unpaidInvoices: number;

  lowStock: number;

  inspectionNext30Days: number;

  averageTicket: number;

  customerCount: number;

  repeatRate: number;

  grossMargin: number;

}

export default function ManagementDashboardCard() {

  const [dashboard, setDashboard] =
    useState<Dashboard>();

  useEffect(() => {

    load();

  }, []);

  async function load() {

    const res = await fetch(
      'http://localhost:3001/api/dashboard',
    );

    if (!res.ok) return;

    setDashboard(await res.json());

  }

  if (!dashboard) return null;

  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">

          経営ダッシュボード

        </h1>

        <div className="text-gray-500 mt-2">

          店舗の状況をリアルタイム表示

        </div>

      </div>

      <div className="grid grid-cols-4 gap-5">

        <Card
          title="本日売上"
          value={`¥${dashboard.todaySales.toLocaleString()}`}
          color="bg-blue-600"
        />

        <Card
          title="今月売上"
          value={`¥${dashboard.monthSales.toLocaleString()}`}
          color="bg-green-600"
        />

        <Card
          title="今月利益"
          value={`¥${dashboard.monthProfit.toLocaleString()}`}
          color="bg-orange-500"
        />

        <Card
          title="平均単価"
          value={`¥${dashboard.averageTicket.toLocaleString()}`}
          color="bg-purple-600"
        />

      </div>

      <div className="grid grid-cols-4 gap-5">

        <Card
          title="入庫中"
          value={dashboard.vehiclesInShop}
          color="bg-cyan-600"
        />

        <Card
          title="本日予約"
          value={dashboard.reservationsToday}
          color="bg-indigo-600"
        />

        <Card
          title="未収金"
          value={dashboard.unpaidInvoices}
          color="bg-red-600"
        />

        <Card
          title="発注必要"
          value={dashboard.lowStock}
          color="bg-yellow-500"
        />

      </div>

      <div className="grid grid-cols-4 gap-5">

        <Card
          title="30日以内車検"
          value={dashboard.inspectionNext30Days}
          color="bg-pink-600"
        />

        <Card
          title="顧客数"
          value={dashboard.customerCount}
          color="bg-slate-600"
        />

        <Card
          title="リピート率"
          value={`${dashboard.repeatRate}%`}
          color="bg-emerald-600"
        />

        <Card
          title="粗利率"
          value={`${dashboard.grossMargin}%`}
          color="bg-amber-600"
        />

      </div>

    </div>

  );

}

interface CardProps {

  title: string;

  value: string | number;

  color: string;

}

function Card({

  title,

  value,

  color,

}: CardProps) {

  return (

    <div
      className={`${color} rounded-2xl p-6 text-white shadow-lg`}
    >

      <div className="text-sm opacity-80">

        {title}

      </div>

      <div className="mt-4 text-3xl font-bold">

        {value}

      </div>

    </div>

  );

}