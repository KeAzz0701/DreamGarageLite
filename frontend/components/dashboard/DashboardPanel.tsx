// frontend/components/dashboard/DashboardPanel.tsx
//
// ホーム画面の各セクションを囲むパネル。スマホでは今まで通り常に展開表示だが、
// PC幅(globals.cssの min-width:1024px)ではダッシュボードのカードとして扱われ、
// ヘッダーをクリックすると開閉できるようになる。

'use client';

import { useState } from 'react';

export function DashboardPanel({
  icon,
  title,
  count,
  linkHref,
  linkLabel = '一覧を見る →',
  defaultOpen = false,
  children,
}: {
  icon: string;
  title: string;
  count?: number;
  linkHref?: string;
  linkLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`dash-panel ${open ? 'is-open' : ''}`}>
      <div className="dash-panel-head" onClick={() => setOpen((v) => !v)}>
        <h3>
          <span aria-hidden>{icon}</span>
          {title}
          {count !== undefined && <span className="dash-panel-count">{count}</span>}
        </h3>
        <span className="dash-panel-actions">
          {linkHref && (
            <a href={linkHref} onClick={(e) => e.stopPropagation()}>
              {linkLabel}
            </a>
          )}
          <span className="dash-panel-chevron" aria-hidden>
            ▾
          </span>
        </span>
      </div>
      <div className="dash-panel-body">{children}</div>
    </div>
  );
}
