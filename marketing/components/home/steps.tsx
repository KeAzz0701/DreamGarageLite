import { Reveal, RevealGroup } from '@/components/motion/reveal'

const steps = [
  {
    no: '01',
    title: 'お問い合わせ・資料請求',
    description: 'まずはフォームからお気軽にご連絡ください。担当者が導入のご相談を承ります。',
  },
  {
    no: '02',
    title: 'オンラインデモ・ご提案',
    description: '実際の画面をご覧いただきながら、工場に合った使い方をご提案します。',
  },
  {
    no: '03',
    title: '初期設定・データ登録',
    description: '既存の顧客・車両データの取り込みや初期設定を、専任スタッフがサポートします。',
  },
  {
    no: '04',
    title: '運用スタート',
    description: '導入後も操作サポートを継続。安心して日々の業務にお使いいただけます。',
  },
]

export function Steps() {
  return (
    <section className="bg-muted/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal direction="left" className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-primary">FLOW</p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-4xl">導入の流れ</h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            お問い合わせから運用開始まで、専任スタッフがしっかりサポートします。
          </p>
        </Reveal>

        <RevealGroup
          direction="up"
          staggerDelay={0.12}
          className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step) => (
            <div key={step.no} className="relative rounded-2xl border border-border bg-card p-7">
              <span className="text-3xl font-black text-primary/30">{step.no}</span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
