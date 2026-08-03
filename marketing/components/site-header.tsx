'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navItems, siteConfig } from '@/lib/site'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-18 md:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Wrench className="size-5 text-primary" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight">{siteConfig.productName}</span>
            <span className="text-[10px] font-medium text-muted-foreground">by {siteConfig.companyName}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="メインナビゲーション">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary',
                  active ? 'text-primary' : 'text-foreground/80',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden md:block">
          <Button
            size="lg"
            nativeButton={false}
            className="font-bold"
            render={<Link href="/contact">資料請求</Link>}
          />
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground md:hidden"
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="モバイルナビゲーション">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-md px-3 py-3 text-base font-medium transition-colors',
                    active ? 'bg-muted text-primary' : 'text-foreground/90 hover:bg-muted',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <Button
              size="lg"
              nativeButton={false}
              className="mt-2 w-full font-bold"
              render={<Link href="/contact" onClick={() => setOpen(false)}>資料請求</Link>}
            />
          </nav>
        </div>
      )}
    </header>
  )
}
