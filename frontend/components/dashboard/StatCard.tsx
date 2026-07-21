// frontend/components/dashboard/StatCard.tsx

'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
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
  blue: 'var(--blue)',
  green: 'var(--ok)',
  orange: 'var(--orange)',
  purple: 'var(--blue)',
  red: 'var(--danger)',
  gray: 'var(--muted)',
};

export default function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className="statcard flex items-center justify-between text-left">
      <div>
        <div className="lbl">{title}</div>
        <div className="num mono">{value}</div>
      </div>

      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded text-2xl text-white"
        style={{ background: colors[color] }}
      >
        {icon}
      </div>
    </div>
  );
}
