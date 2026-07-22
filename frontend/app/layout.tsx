// frontend/app/layout.tsx

import type { Metadata } from 'next';
import { Barlow_Condensed, Noto_Sans_JP, Zen_Kaku_Gothic_New, IBM_Plex_Mono } from 'next/font/google';
import AuthGate from '@/components/auth/AuthGate';
import './globals.css';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-disp',
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-jp',
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-logo-jp',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-plex',
});

export const metadata: Metadata = {
  title: 'ガレージカルテ',
  description: 'Dream Garage Lite',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${barlowCondensed.variable} ${notoSansJp.variable} ${zenKakuGothicNew.variable} ${ibmPlexMono.variable}`}
    >
      <body>

        <AuthGate>{children}</AuthGate>

      </body>
    </html>
  );
}