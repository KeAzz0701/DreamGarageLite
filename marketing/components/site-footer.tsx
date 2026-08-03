import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { navItems, siteConfig } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-background/10">
                <Wrench className="size-5 text-primary" aria-hidden="true" />
              </span>
              <span className="text-base font-bold">{siteConfig.productName}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/70">
              整備工場のための顧客・車両管理クラウド。日々の業務をシンプルに、確かに。
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-secondary-foreground">メニュー</h2>
            <ul className="mt-4 space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-secondary-foreground">会社情報</h2>
            <address className="mt-4 space-y-2 text-sm not-italic leading-relaxed text-secondary-foreground/70">
              <p>{siteConfig.companyName}</p>
              <p>〒000-0000 東京都◯◯区◯◯ 0-0-0</p>
              <p>TEL: 00-0000-0000</p>
              <p>受付時間: 平日 9:00〜18:00</p>
            </address>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-background/10 pt-6 text-xs text-secondary-foreground/60 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {siteConfig.companyName} All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="#" className="transition-colors hover:text-primary">
              プライバシーポリシー
            </Link>
            <Link href="#" className="transition-colors hover:text-primary">
              利用規約
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
