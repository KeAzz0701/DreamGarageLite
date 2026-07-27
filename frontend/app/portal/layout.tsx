// frontend/app/portal/layout.tsx

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'ガレージ・カルテ ポータル',
  description: 'お客様専用の整備履歴・車両情報ポータル',
  manifest: '/manifest-portal.json',
  icons: {
    icon: [
      { url: '/icons/portal-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/portal-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/portal-apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'カルテポータル',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f4d63',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
