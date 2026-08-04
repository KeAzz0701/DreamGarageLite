import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, Noto_Sans_Mono } from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
})

const notoSansMono = Noto_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-noto-sans-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ガレージ・カルテ | 整備工場の顧客・車両管理をまるごとデジタル化',
    template: '%s | ガレージ・カルテ',
  },
  description:
    '「ガレージ・カルテ」は整備工場（町工場）向けのクラウド管理システム。顧客・車両管理、予約、見積、LINE連携リマインドをひとつに。DreamGarageが提供します。',
  keywords: ['整備工場', '自動車整備', '顧客管理', '車両管理', 'LINE連携', '予約管理', '見積作成', 'SaaS'],
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#24262b',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSansMono.variable} bg-background`}>
      <body className="antialiased font-sans">
        <SiteHeader />
        {children}
        <SiteFooter />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
