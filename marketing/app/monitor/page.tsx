import type { Metadata } from 'next'
import { CheckCircle2, MessageSquareHeart, Users2, Gift } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { ContactForm } from '@/components/contact/contact-form'
import { Reveal } from '@/components/motion/reveal'

export const metadata: Metadata = {
  title: '先行導入モニター募集',
  description:
    '「ガレージ・カルテ」の先行導入モニターを5社限定で募集しています。利用料無料、実際の現場でお試しいただきフィードバックをお寄せください。',
}

const benefits = [
  {
    icon: Gift,
    title: 'モニター期間中は無料',
    description: '先行導入モニターの期間中、利用料は一切かかりません。まずは実際の現場で試していただくための企画です。',
  },
  {
    icon: Users2,
    title: '5社限定',
    description: '一社ずつ丁寧にサポートしたいため、今回は5社限定での募集です。導入時の設定もこちらでお手伝いします。',
  },
  {
    icon: MessageSquareHeart,
    title: '現場の声を製品に反映',
    description: '使ってみて感じた使いにくさ・欲しい機能を直接お聞かせください。いただいたご意見は開発に反映していきます。',
  },
]

export default function MonitorPage() {
  return (
    <main>
      <PageHero
        eyebrow="PILOT PROGRAM"
        title="先行導入モニター 5社限定募集"
        description="整備工場向け管理システム「ガレージ・カルテ」を、実際の現場で無料でお試しいただけるモニターを募集しています。顧客・車両管理、LINE点検リマインド、予約管理、見積作成までをまとめてご体験ください。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Reveal key={benefit.title} delay={index * 0.08}>
                <div className="h-full rounded-2xl border border-border bg-card p-7">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <benefit.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-black tracking-tight">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2} className="mt-10 rounded-2xl border border-border bg-muted/60 p-7">
            <h3 className="text-lg font-black tracking-tight">こんな整備工場におすすめです</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                '車検・点検の案内をハガキや電話で行っていて手間を感じている',
                '顧客・車両の情報や整備履歴が紙やExcelでバラバラになっている',
                '予約のダブルブッキングや確認漏れが起きたことがある',
                '見積書の作成に毎回時間がかかっている',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-muted/40 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <h2 className="text-center text-2xl font-black tracking-tight md:text-3xl">モニター応募フォーム</h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            下記フォームの「お問い合わせ内容」欄に「先行導入モニター希望」とご記入のうえ、送信してください。
            内容を確認のうえ、2営業日以内にご連絡いたします。
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  )
}
