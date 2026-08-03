import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { FeatureMedia } from '@/components/home/feature-media'
import { features } from '@/lib/features'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: '機能紹介',
  description:
    '「ガレージ・カルテ」の機能を詳しくご紹介。顧客・車両管理、LINE連携リマインド、予約管理、見積作成まで、整備工場の業務をまるごとデジタル化します。',
}

export default function FeaturesPage() {
  return (
    <main>
      <PageHero
        eyebrow="FEATURES"
        title="機能紹介"
        description="整備工場の日々の業務に寄り添う、「ガレージ・カルテ」の主な機能をご紹介します。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 md:px-6 md:gap-28">
          {features.map((feature, index) => {
            const reversed = index % 2 === 1
            // 画像/動画は自分側から、テキストは反対側からスライドイン。画像が先に、
            // テキストは少し遅れて流れるように出す(依頼: 「画像が出てきて文字があとから」)
            const mediaDirection = reversed ? 'left' : 'right'
            const textDirection = reversed ? 'right' : 'left'

            return (
              <div
                key={feature.id}
                id={feature.id}
                className="grid scroll-mt-24 items-center gap-10 md:grid-cols-2 md:gap-14"
              >
                <Reveal direction={textDirection} delay={0.15} className={cn(reversed && 'md:order-2')}>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-black tracking-tight md:text-3xl">{feature.title}</h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{feature.description}</p>
                  <ul className="mt-6 space-y-3">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/90">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>

                <Reveal direction={mediaDirection} className={cn(reversed && 'md:order-1')}>
                  <FeatureMedia feature={feature} />
                </Reveal>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-t border-border bg-muted/60 py-16 md:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center md:px-6">
          <h2 className="text-balance text-2xl font-black tracking-tight md:text-3xl">
            気になる機能があれば、お気軽にご相談ください。
          </h2>
          <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground">
            工場ごとの運用に合わせた使い方を、オンラインデモでご案内します。
          </p>
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
      </section>
    </main>
  )
}