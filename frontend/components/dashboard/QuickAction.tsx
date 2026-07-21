// frontend/components/dashboard/QuickAction.tsx

'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface QuickActionProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  color?:
    | 'blue'
    | 'green'
    | 'orange'
    | 'purple'
    | 'red'
    | 'gray';
}

const colors = {
  blue: 'btn-blue',
  green: 'btn-blue',
  orange: 'btn-primary',
  purple: 'btn-blue',
  red: 'btn-danger',
  gray: 'btn-dark',
};

export default function QuickAction({
  href,
  title,
  description,
  icon,
  color = 'blue',
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`btn ${colors[color]} block p-6 text-left`}
    >
      <div className="mb-3 text-4xl">{icon}</div>

      <div className="disp text-xl">{title}</div>

      <div className="mt-1 text-sm opacity-90">{description}</div>
    </Link>
  );
}
