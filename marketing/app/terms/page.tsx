import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: '利用規約',
  description: `${siteConfig.companyName}が運営する本サイトのご利用にあたっての規約`,
}

const sections = [
  {
    title: '第1条(適用)',
    body: '本規約は、本サイトの閲覧・お問い合わせフォームのご利用等、本サイトが提供する全てのサービス(以下「本サービス」といいます)の利用条件を定めるものです。ご利用者様(以下「ユーザー」といいます)には、本規約に従って本サービスをご利用いただきます。',
  },
  {
    title: '第2条(禁止事項)',
    body: 'ユーザーは、本サービスの利用にあたり、以下の行為をしてはならないものとします。\n・法令または公序良俗に違反する行為\n・本サイトの運営を妨害する行為\n・不正な目的をもって本サービスを利用する行為\n・本サイトのシステムに対する不正アクセスまたはこれを試みる行為\n・その他、当社が不適切と判断する行為',
  },
  {
    title: '第3条(本サービスの提供の停止等)',
    body: '当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。\n・本サービスにかかるシステムの保守点検または更新を行う場合\n・地震、落雷、火災、停電、天災などの不可抗力により本サービスの提供が困難となった場合\n・その他、当社が本サービスの提供が困難と判断した場合',
  },
  {
    title: '第4条(著作権)',
    body: '本サイトに掲載される文章、画像、その他一切のコンテンツに関する著作権その他の権利は、当社または正当な権利を有する第三者に帰属します。ユーザーは、当社の事前の承諾なく、これらを複製、転用、改変等することはできません。',
  },
  {
    title: '第5条(免責事項)',
    body: '当社は、本サイトに掲載する情報の正確性・最新性について万全を期しておりますが、その内容を保証するものではありません。本サイトの情報を利用したことにより生じた損害について、当社は一切の責任を負わないものとします。',
  },
  {
    title: '第6条(本規約の変更)',
    body: '当社は、必要と判断した場合には、ユーザーに通知することなく本規約を変更できるものとします。変更後の利用規約は、本サイトに掲載した時点から効力を生じるものとします。',
  },
  {
    title: '第7条(準拠法・管轄裁判所)',
    body: '本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社所在地を管轄する裁判所を専属的合意管轄とします。',
  },
]

export default function TermsPage() {
  return (
    <main>
      <PageHero
        eyebrow="TERMS"
        title="利用規約"
        description="本サイトのご利用にあたっての規約です。あらかじめご了承のうえご利用ください。"
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
