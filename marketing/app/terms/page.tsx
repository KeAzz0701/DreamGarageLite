import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: '利用規約',
  description: `${siteConfig.productName}のご利用にあたっての規約`,
}

const sections = [
  {
    title: '第1条(サービス内容)',
    body: `${siteConfig.productName}(以下「本サービス」といいます)は、整備事業者向けに顧客管理、車両管理、整備履歴、見積、予約管理、LINE連携、OCRおよびAI機能等を提供するクラウドサービスです。`,
  },
  {
    title: '第2条(アカウント)',
    body: '利用者は、自己のアカウント情報を適切に管理し、第三者に共有または利用させてはならないものとします。不正利用またはその疑いを認識した場合は、直ちに当社窓口へご連絡ください。',
  },
  {
    title: '第3条(AI・OCR機能について)',
    body: '本サービスが提供するOCRおよびAIの出力は参考情報です。当社は、その正確性、完全性、最新性または特定目的への適合性を保証しません。整備内容の判断、法務・税務上の判断、顧客への案内および見積内容については、ご利用店舗様ご自身の最終確認と責任においてご対応いただきます。',
  },
  {
    title: '第4条(禁止事項)',
    body: '利用者は、本サービスの利用にあたり、以下の行為をしてはならないものとします。\n・法令または公序良俗に違反する行為\n・不正アクセスまたはこれを試みる行為\n・本サービスに過度な負荷をかける行為\n・スパム送信その他本サービスの運営を妨害する行為\n・本サービスのリバースエンジニアリング\n・他者の権利または個人情報を侵害する行為\n・虚偽の情報を登録する行為\n・その他、当社が不適切と判断する行為',
  },
  {
    title: '第5条(サービスの変更・停止)',
    body: '当社は、本サービスの機能の追加、変更、提供の停止または終了を行うことがあります。重要な変更については、合理的な方法で利用者へ通知します。',
  },
  {
    title: '第6条(知的財産権)',
    body: '本サービス、ソフトウェア、デザインおよび関連資料に関する知的財産権その他の権利は、当社または正当な権利を有する第三者に帰属します。',
  },
  {
    title: '第7条(データの取扱い)',
    body: 'ご利用店舗様が入力または連携する顧客、車両、整備履歴その他のデータは、ご利用店舗様の管理下にあるものとします。当社は、本サービスの提供、保守、安全管理およびご利用店舗様からのご依頼への対応のためにのみ、これらのデータを取り扱います。',
  },
  {
    title: '第8条(料金・解約・返金)',
    body: '有料プランの料金は月額(税込)とし、月単位でご請求します。利用者はいつでも解約をお申し出いただけますが、解約された月のご利用料金について、日割り・月割りいずれの返金も行いません。解約は、お申し出いただいた翌月以降のご請求から反映されます。',
  },
  {
    title: '第9条(本規約の変更)',
    body: '当社は、必要と判断した場合には、本規約を変更できるものとします。変更後の利用規約は、本サービス上に掲載した時点から効力を生じるものとします。',
  },
  {
    title: '第10条(準拠法・管轄裁判所)',
    body: '本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社所在地を管轄する裁判所を専属的合意管轄とします。',
  },
]

export default function TermsPage() {
  return (
    <main>
      <PageHero
        eyebrow="TERMS"
        title="利用規約"
        description={`${siteConfig.productName}のご利用にあたっての規約です。あらかじめご了承のうえご利用ください。`}
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <div className="flex flex-col gap-10">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-lg font-black tracking-tight">{s.title}</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-16 text-right text-xs text-muted-foreground">制定日: 2026年8月9日</p>
        </div>
      </section>
    </main>
  )
}
