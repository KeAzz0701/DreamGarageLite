import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: `${siteConfig.productName}の有料プランのお申込みにあたり、特定商取引法に基づき表示する事項`,
}

const items: { label: string; value: string }[] = [
  {
    label: '事業者名',
    value: '確定次第掲載いたします',
  },
  {
    label: '運営統括責任者',
    value: '確定次第掲載いたします',
  },
  {
    label: '所在地',
    value: '確定次第掲載いたします',
  },
  {
    label: '電話番号',
    value: '確定次第掲載いたします(お問い合わせはまずメールにて承っております)',
  },
  {
    label: 'メールアドレス',
    value: 'info@dreamgaragelite.com',
  },
  {
    label: '販売価格',
    value: '各プランの月額料金(税込)は、サービス内の料金プランページに表示のとおりです。送料等の付随費用はありません。',
  },
  {
    label: '商品代金以外の必要料金',
    value: 'お振込みでお支払いの場合の振込手数料は、お客様のご負担となります。',
  },
  {
    label: 'お支払い方法',
    value: '現金、銀行振込。クレジットカード等のオンライン決済は、決済代行サービスとの契約完了後にご案内いたします。',
  },
  {
    label: 'お支払い時期',
    value: 'お支払い方法選択後、店舗にて入金確認および運営による承認が完了した時点でプランが切り替わります。以降は月単位でのご請求となります。',
  },
  {
    label: 'サービス提供時期',
    value: '入金確認・運営承認後、直ちにご利用いただけます。',
  },
  {
    label: '契約期間・自動更新',
    value: '月額課金制で、期間の定めなく自動更新されます。都度のお申込みは不要です。',
  },
  {
    label: '返品・キャンセル・解約について',
    value: 'いつでも解約をお申し出いただけます。解約された月のご利用料金について、日割り・月割りいずれの返金も行いません。解約は、お申し出いただいた翌月以降のご請求から反映されます。デジタルサービスの性質上、提供済みの役務についての返品はお受けできません。',
  },
  {
    label: '動作環境',
    value: 'スマートフォン・タブレット・パソコンの主要ブラウザ最新版でのご利用を推奨します。',
  },
]

export default function TokushohoPage() {
  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="特定商取引法に基づく表記"
        description="有料プランのお申込みにあたり、特定商取引法に基づき以下のとおり表示いたします。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <dl className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <div key={item.label} className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-6">
                <dt className="text-sm font-bold text-foreground">{item.label}</dt>
                <dd className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
            事業者名・所在地・電話番号等、現在確定準備中の項目は、確定次第速やかに掲載いたします。
          </p>
          <p className="mt-8 text-right text-xs text-muted-foreground">制定日: 2026年8月9日</p>
        </div>
      </section>
    </main>
  )
}
