import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal, RevealGroup } from '@/components/motion/reveal'

interface PlanFeature {
  label: string
  included: boolean
}

interface Plan {
  key: string
  name: string
  price: string
  tagline: string
  recommended?: boolean
  features: PlanFeature[]
  ctaLabel: string
}

const plans: Plan[] = [
  {
    key: 'FREE',
    name: 'FREE',
    price: '¥0',
    tagline: '基本機能を試したい店舗向け',
    features: [
      { label: '車検証OCR 月5件', included: true },
      { label: '顧客登録 30件まで', included: true },
      { label: '交換時期の通知', included: false },
      { label: 'LINE自動応答', included: false },
      { label: 'Web予約受付', included: false },
    ],
    ctaLabel: '無料で試す',
  },
  {
    key: 'LITE',
    name: 'LITE',
    price: '¥980',
    tagline: '顧客管理と再来店フォローを始めたい店舗向け',
    features: [
      { label: '車検証OCR 月15件', included: true },
      { label: '顧客登録 無制限', included: true },
      { label: '交換時期の通知', included: true },
      { label: 'LINE自動応答', included: false },
      { label: 'Web予約受付', included: false },
    ],
    ctaLabel: 'LITEで始める',
  },
  {
    key: 'STANDARD',
    name: 'STANDARD',
    price: '¥2,980',
    tagline: 'LINE対応まで効率化したい店舗向け',
    recommended: true,
    features: [
      { label: '車検証OCR 月30件', included: true },
      { label: '顧客登録 無制限', included: true },
      { label: '交換時期の通知', included: true },
      { label: 'LINE自動応答', included: true },
      { label: 'Web予約受付', included: false },
    ],
    ctaLabel: 'STANDARDで始める',
  },
  {
    key: 'PRO',
    name: 'PRO',
    price: '¥5,980',
    tagline: '予約受付までまとめて管理したい店舗向け',
    features: [
      { label: '車検証OCR 月60件', included: true },
      { label: '顧客登録 無制限', included: true },
      { label: '交換時期の通知', included: true },
      { label: 'LINE自動応答', included: true },
      { label: 'Web予約受付', included: true },
    ],
    ctaLabel: '導入相談をする',
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-muted/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal direction="left" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-primary">PRICING</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-4xl">
            店舗の運用に合わせて選べる4つのプラン
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            まずは無料で基本機能を試し、必要に応じて顧客管理・再来店フォロー・LINE対応・予約受付まで段階的に広げられます。
          </p>
        </Reveal>

        <RevealGroup
          direction="up"
          staggerDelay={0.1}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border bg-card p-7 ${
                plan.recommended ? 'border-primary shadow-lg' : 'border-border'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  おすすめ
                </span>
              )}

              <h3 className="text-lg font-black tracking-wide text-primary">{plan.name}</h3>
              <p className="mt-2 text-3xl font-black">
                {plan.price}
                <span className="ml-1 text-sm font-medium text-muted-foreground">/月（税別）</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.tagline}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground/60'}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                nativeButton={false}
                variant={plan.recommended ? 'default' : 'outline'}
                className="mt-6 w-full justify-center font-bold"
                render={<Link href="/contact">{plan.ctaLabel}</Link>}
              />
            </div>
          ))}
        </RevealGroup>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          価格はすべて税別表示です。お支払い方法・お申込みの流れはお問い合わせ時にご案内します。
        </p>
      </div>
    </section>
  )
}
