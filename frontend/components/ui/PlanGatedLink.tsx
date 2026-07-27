// frontend/components/ui/PlanGatedLink.tsx

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

const DEFAULT_LOCKED_MESSAGE =
  'このプランではご利用いただけません。プランをアップグレードするとお使いいただけます。';

/** プランによって使える/使えないが分かれる機能へのリンク。使えない場合はアイコンに「／」を重ねて無効化する */
export function PlanGatedLink({
  allowed,
  href,
  className,
  children,
  lockedMessage = DEFAULT_LOCKED_MESSAGE,
}: {
  allowed: boolean;
  href: string;
  className?: string;
  children: ReactNode;
  lockedMessage?: string;
}) {
  if (allowed) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => alert(lockedMessage)}
      className={className}
      title={lockedMessage}
      style={{ position: 'relative', opacity: 0.5, cursor: 'not-allowed' }}
    >
      {children}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3em',
          fontWeight: 700,
          color: 'var(--danger)',
          pointerEvents: 'none',
        }}
      >
        ／
      </span>
    </button>
  );
}
