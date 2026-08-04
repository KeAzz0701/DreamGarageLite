import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/motion/reveal'

export function FinalCta() {
  return (
    <section className="bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal direction="left">
            <h2 className="text-balance text-3xl font-black leading-tight tracking-tight md:text-4xl">
              まずは、資料請求から。
            </h2>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-secondary-foreground/75">
              「ガレージ・カルテ」の機能や料金の詳細をまとめた資料を無料でお送りします。
              導入のご相談・オンラインデモも承っておりますので、お気軽にお問い合わせください。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                className="h-12 px-6 text-base font-bold"
                render={
                  <Link href="/contact" data-icon="inline-end">
                    資料請求・お問い合わせ
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.1} className="rounded-2xl border border-background/10 bg-background/5 p-7">
            <p className="flex items-center gap-2 text-sm font-bold text-secondary-foreground">
              <Mail className="size-4 text-primary" aria-hidden="true" />
              メールでのお問い合わせ
            </p>
            <a
              href="mailto:info@dreamgaragelite.com"
              className="mt-2 block text-2xl font-black text-primary hover:opacity-80 md:text-3xl"
            >
              info@dreamgaragelite.com
            </a>
            <p className="mt-3 text-sm leading-relaxed text-secondary-foreground/70">
              フォームからは24時間受け付けております。2営業日以内に担当者よりご返信いたします。
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}