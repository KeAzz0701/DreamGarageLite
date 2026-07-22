// frontend/components/auth/AuthGate.tsx

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (pathname === '/login') return;

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
    </>
  );
}
