import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: `${siteConfig.companyName}が運営する本サイトにおける個人情報の取り扱いについて`,
}

const sections = [
  {
    title: '1. 基本方針',
    body: `${siteConfig.companyName}(以下「当社」といいます)は、本サイトのご利用にあたりお預かりする個人情報を適切に取り扱うことが社会的責務であると認識し、以下の方針に基づき個人情報の保護に努めます。`,
  },
  {
    title: '2. 取得する情報',
    body: '本サイトのお問い合わせフォームをご利用いただく際、会社名、お名前、メールアドレス、電話番号、お問い合わせ内容をご入力いただきます。',
  },
  {
    title: '3. 利用目的',
    body: '取得した個人情報は、お問い合わせへの回答、資料のご送付、導入に関するご案内のためにのみ利用し、これら以外の目的には利用いたしません。',
  },
  {
    title: '4. 第三者提供',
    body: '取得した個人情報は、法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。',
  },
  {
    title: '5. 業務委託',
    body: 'メールの送受信等、お問い合わせ対応に必要な範囲で外部サービスを利用する場合があります。この場合、当該委託先に対して適切な管理を求めます。',
  },
  {
    title: '6. アクセス解析について',
    body: '本サイトは、サービス改善の目的でアクセス解析ツールを利用する場合があります。これによって収集される情報は個人を特定するものではありません。',
  },
  {
    title: '7. 個人情報の開示・訂正・削除',
    body: 'ご本人からの個人情報の開示、訂正、削除等のご請求については、下記お問い合わせ窓口にて対応いたします。',
  },
  {
    title: '8. お問い合わせ窓口',
    body: `${siteConfig.companyName}\nEmail: info@dreamgaragelite.com`,
  },
  {
    title: '9. 本ポリシーの変更',
    body: '本ポリシーの内容は、法令の変更その他の事由により、予告なく変更することがあります。変更後のプライバシーポリシーは、本サイトに掲載した時点から効力を生じるものとします。',
  },
]

export default function PrivacyPage() {
  return (
    <main>
      <PageHero
        eyebrow="PRIVACY"
        title="プライバシーポリシー"
        description="本サイトにおける個人情報の取り扱いについてご案内します。"
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

          <p className="mt-16 text-right text-xs text-muted-foreground">制定日: 2026年8月4日</p>
        </div>
      </section>
    </main>
  )
}
