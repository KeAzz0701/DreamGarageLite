// frontend/components/layout/DashboardHeader.tsx

'use client';

import Link from 'next/link';
import { useCompany } from '@/hooks/useCompany';

export default function DashboardHeader() {
  const { company } = useCompany();

  const plan = company?.license?.plan ?? '-';
  const used = company?.license?.usedOcr ?? 0;
  const max = company?.license?.maxOcrPerMonth ?? 0;

  return (
    <header className="bg-white border-b shadow-sm">

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <div>

          <div className="text-2xl font-bold">
            🚗 ガレージカルテ
          </div>

          <div className="text-sm text-gray-500">
            {company?.companyName}
          </div>

        </div>

        <div className="flex items-center gap-8">

          <Link href="/">
            ホーム
          </Link>

          <Link href="/customer">
            顧客
          </Link>

          <Link href="/vehicle">
            車両
          </Link>

          <Link href="/ocr">
            OCR
          </Link>

          <Link href="/settings">
            設定
          </Link>

        </div>

        <div className="flex gap-6 text-sm">

          <div className="text-center">
            <div className="text-gray-500">
              プラン
            </div>

            <div className="font-bold">
              {plan}
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-500">
              OCR
            </div>

            <div className="font-bold">
              {max === -1 ? '∞' : `${used}/${max}`}
            </div>
          </div>

        </div>

      </div>

    </header>
  );
}