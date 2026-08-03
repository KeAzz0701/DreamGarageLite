import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { features } from '@/lib/features'
import { Reveal, RevealGroup } from '@/components/motion/reveal'

export function FeatureHighlights() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal direction="left" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-primary">FEATURES</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-4xl">
            工場の業務に必要な機能を、ひとつに。
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            バラバラだった管理を「ガレージ・カルテ」に集約。パソコンが苦手な方でも使えるシンプルな操作性です。
          </p>
        </Reveal>

        <RevealGroup direction="up" staggerDelay={0.12} className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 transition-shadow hover:shadow-lg"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-muted-foreground">{feature.short}</p>
              <Link
                href={`/features#${feature.id}`}
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80"
              >
                詳しく見る
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
