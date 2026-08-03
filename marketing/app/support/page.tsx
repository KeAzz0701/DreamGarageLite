import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, MessageCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/page-hero'
import { FaqAccordion, type FaqItem } from '@/components/support/faq-accordion'
import { Reveal, RevealGroup } from '@/components/motion/reveal'

export const metadata: Metadata = {
  title: 'サポート・使い方',
  description:
    '「ガレージ・カルテ」のよくあるご質問と使い方のご案内。導入前の疑問から日々の操作まで、サポート体制でお応えします。',
}

const faqCategories: { category: string; items: FaqItem[] }[] = [
  {
    category: '導入について',
    items: [
      {
        question: '導入にあたって特別な機器は必要ですか？',
        answer:
          'インターネットに接続されたパソコン・タブレット・スマートフォンがあればご利用いただけます。専用の機器を購入いただく必要はありません。（※詳細な動作環境は後日掲載予定です）',
      },
      {
        question: '今使っている顧客データを移行できますか？',
        answer:
          'ExcelやCSV形式のデータからの移行に対応予定です。移行作業は専任スタッフがサポートいたしますので、お気軽にご相談ください。',
      },
    ],
  },
  {
    category: '機能・操作について',
    items: [
      {
        question: 'パソコンが苦手なスタッフでも使えますか？',
        answer:
          'はい。現場の整備士の方でも直感的に使えるシンプルな画面設計です。導入時の操作説明や、運用開始後のサポートもご用意しています。',
      },
      {
        question: 'LINEでのリマインドはどのように送られますか？',
        answer:
          '車検や点検の時期に合わせて、登録されたお客様へ自動でメッセージを送信します。文面はテンプレートから簡単に作成・編集できます。（※詳細は準備中です）',
      },
    ],
  },
  {
    category: '料金・契約について',
    items: [
      {
        question: '料金体系を教えてください。',
        answer:
          '工場の規模やご利用機能に応じたプランをご用意する予定です。詳しい料金は資料請求または個別のお見積りにてご案内いたします。',
      },
      {
        question: '契約期間の縛りはありますか？',
        answer:
          '契約条件の詳細については、こちらに順次掲載してまいります。現時点ではお問い合わせフォームよりお気軽にご確認ください。',
      },
    ],
  },
]

export default function SupportPage() {
  return (
    <main>
      <PageHero
        eyebrow="SUPPORT"
        title="サポート・使い方"
        description="よくあるご質問と使い方のご案内です。解決しない場合は、お気軽にお問い合わせください。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <RevealGroup direction="up" staggerDelay={0.12} className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold">操作マニュアル</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  各機能の詳しい使い方をまとめています。
                </p>
                <Link
                  href="/support/manual"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80"
                >
                  マニュアルを見る
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold">お問い合わせサポート</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  疑問やお困りごとは専任スタッフが対応します。
                </p>
                <Link
                  href="/contact"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80"
                >
                  問い合わせる
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </RevealGroup>

          <div className="mt-16 space-y-12">
            {faqCategories.map((cat) => (
              <Reveal key={cat.category} direction="left">
                <h2 className="mb-4 text-xl font-black tracking-tight">{cat.category}</h2>
                <FaqAccordion items={cat.items} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
