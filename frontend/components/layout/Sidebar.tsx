// frontend/components/layout/Sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menus = [
  {
    href: '/',
    icon: '🏠',
    title: 'ホーム',
  },
  {
    href: '/ocr',
    icon: '📷',
    title: '車検証OCR',
  },
  {
    href: '/customer',
    icon: '👤',
    title: '顧客管理',
  },
  {
    href: '/vehicle',
    icon: '🚗',
    title: '車両管理',
  },
  {
    href: '/settings',
    icon: '⚙️',
    title: '設定',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800 text-white min-h-screen">

      <div className="border-b border-slate-700 p-6">

        <div className="text-2xl font-bold">
          ガレージカルテ
        </div>

        <div className="text-sm text-slate-300 mt-1">
          Dream Garage Lite
        </div>

      </div>

      <nav className="mt-5">

        {menus.map((menu) => {

          const active =
            pathname === menu.href;

          return (

            <Link
              key={menu.href}
              href={menu.href}
              className={`flex items-center gap-4 px-6 py-4 transition

              ${
                active
                  ? 'bg-blue-600'
                  : 'hover:bg-slate-700'
              }`}
            >

              <span className="text-2xl">
                {menu.icon}
              </span>

              <span className="font-semibold">
                {menu.title}
              </span>

            </Link>

          );

        })}

      </nav>

    </aside>
  );
}