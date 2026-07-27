// frontend/components/auth/AuthGate.tsx

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';
import ErrorReportButton from '@/components/layout/ErrorReportButton';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  const isAdminRoute = pathname.startsWith('/admin');
  const isPortalRoute = pathname.startsWith('/portal');

  useEffect(() => {
    if (pathname === '/login' || isAdminRoute || isPortalRoute) return;

    let cancelled = false;

    api('/auth/me')
      .then(() => {
        if (!cancelled) setAuthed(true);
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (pathname === '/login') {
    return <main>{children}</main>;
  }

  if (isPortalRoute) {
    return <main className="portal-shell">{children}</main>;
  }

  if (isAdminRoute) {
    if (pathname === '/admin/login') {
      return <main>{children}</main>;
    }

    return (
      <>
        <div className="admin-header">
          <div className="title">
            <div className="icon">🛠️</div>
            <div>
              <div className="label">運営管理画面</div>
              <div className="sub">ガレージ・カルテ / 会社ログインとは別物</div>
            </div>
          </div>
        </div>
        <main>{children}</main>
      </>
    );
  }

  if (!authed) {
    return (
      <div className="text-center text-[var(--muted)] py-10">
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main>{children}</main>
      <ErrorReportButton />
    </>
  );
}
