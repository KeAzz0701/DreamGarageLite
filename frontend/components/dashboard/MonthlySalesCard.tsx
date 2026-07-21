// frontend/components/dashboard/MonthlySalesCard.tsx

'use client';

interface Props {
  totalCustomers: number;
  totalVehicles: number;
  todayOcr: number;
  monthOcr: number;
}

export default function MonthlySalesCard({
  totalCustomers,
  totalVehicles,
  todayOcr,
  monthOcr,
}: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-md">

      <div className="border-b p-6">

        <h2 className="text-2xl font-bold">
          ダッシュボード
        </h2>

      </div>

      <div className="grid grid-cols-2 gap-5 p-6">

        <div className="rounded-xl bg-blue-50 p-5">

          <div className="text-gray-500">
            顧客登録数
          </div>

          <div className="mt-2 text-4xl font-bold text-blue-600">
            {totalCustomers}
          </div>

        </div>

        <div className="rounded-xl bg-green-50 p-5">

          <div className="text-gray-500">
            車両登録数
          </div>

          <div className="mt-2 text-4xl font-bold text-green-600">
            {totalVehicles}
          </div>

        </div>

        <div className="rounded-xl bg-orange-50 p-5">

          <div className="text-gray-500">
            本日のOCR
          </div>

          <div className="mt-2 text-4xl font-bold text-orange-600">
            {todayOcr}
          </div>

        </div>

        <div className="rounded-xl bg-purple-50 p-5">

          <div className="text-gray-500">
            今月OCR
          </div>

          <div className="mt-2 text-4xl font-bold text-purple-600">
            {monthOcr}
          </div>

        </div>

      </div>

    </div>
  );
}