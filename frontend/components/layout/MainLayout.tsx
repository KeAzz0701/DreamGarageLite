// frontend/components/layout/MainLayout.tsx

'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';

interface Props {
  children: ReactNode;
}

export default function MainLayout({
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <Sidebar />

      <div className="flex flex-1 flex-col">

        <DashboardHeader />

        <main className="flex-1 p-6">

          {children}

        </main>

      </div>

    </div>
  );
}