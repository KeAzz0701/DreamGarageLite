import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  KeyRound,
  Users,
  Camera,
  CalendarCheck,
  FileText,
  MessageCircle,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: '操作マニュアル',
  description:
    '「ガレージ・カルテ」の各機能の使い方をご紹介します。ログイン方法から顧客・車両管理、見積作成、LINE連携まで、実際の画面とともにご紹介します。',
}

type Section = {
  id: string
  icon: typeof KeyRound
  title: string
  points: string[]
  image?: string
}

const sections: Section[] = [
  {
    id: 'login',
    icon: KeyRound,
    title: 'ログイン方法',
    image: '/manual/00-login.png',
    points: [
      '会社コードとパスワードを入力してログインします。',
      '運営から発行されるQRコードをスマホのカメラで読み取ると、会社コード・パスワードの入力なしで自動的にログインできます(有効期限24時間の使い捨てQRのため、漏えい時の被害範囲も限定されます)。',
    ],
  },
  {
    id: 'customers',
    icon: Users,
    title: '顧客・車両管理',
    image: '/manual/03-vehicle-detail.png',
    points: [
      'お客様の連絡先や車両情報、整備履歴を「カルテ」としてまとめて記録します。',
      '車両ごとの整備履歴を時系列で確認でき、担当者が変わっても引き継ぎがスムーズです。',
      '車検証の内容(登録番号・車台番号・車検有効期限など)も車両情報として保存されます。',
    ],
  },
  {
    id: 'ocr',
    icon: Camera,
    title: '車検証OCR',
    image: '/manual/04-ocr.png',
    points: [
      '車検証をスマホやタブレットで撮影するだけで、AIが必要な項目を自動で読み取ります。',
      '読み取った内容はその場で確認・修正してから登録するので、誤登録の心配はありません。',
      'お客様がLINEで送ってきた車検証の写真も、スタッフが管理画面から内容を確認して登録できます。',
    ],
  },
  {
    id: 'reservation',
    icon: CalendarCheck,
    title: '予約管理',
    image: '/manual/05-reservations.png',
    points: [
      'カレンダー形式で入庫予定を管理し、作業内容や担当者、ピットの空き状況をひと目で確認できます。',
      '曜日ごとの営業時間・休憩時間・定休日を設定でき、休憩時間は予約枠から自動的に除外されます。',
      '15分単位で予約枠を管理するため、ダブルブッキングを防止できます。',
      'お客様がLINEから直接、空いている日時を選んで予約できます。',
    ],
  },
  {
    id: 'estimate',
    icon: FileText,
    title: '見積作成',
    image: '/manual/06-estimate-new.png',
    points: [
      'よく使う整備メニューや部品代・工賃を登録しておけば、選ぶだけで見積書を作成できます。',
      '車検の法定費用(重量税・自賠責保険料・印紙代)は、軽自動車・普通乗用・大型特殊・貨物といった車種区分ごとに自動で計算されます。',
      '完成した見積書はPDFで発行でき、そのまま作業指示や請求書へ連携できます。',
    ],
  },
  {
    id: 'line',
    icon: MessageCircle,
    title: 'LINEでのお客様対応',
    image: '/manual/01-home.png',
    points: [
      '車検満了の2ヶ月前・1ヶ月前、2週間前からは毎日、LINEで自動的にリマインドをお送りします。メッセージには「予約する」「通知を止める」ボタンが付いています。',
      'オイル交換・タイヤ交換の時期も、過去の整備履歴から目安を計算してLINEでお知らせします。',
      '店舗からのお知らせも、お客様のLINEに配信できます。',
      'お客様はLINE上で整備履歴の確認や新規予約もできます。届いたメッセージは管理画面のホームにも通知されます。',
    ],
  },
  {
    id: 'competitor',
    icon: BarChart3,
    title: '他店比較',
    image: '/manual/07-competitor-estimates.png',
    points: [
      '他店でもらった見積書を撮影すると、AIが店舗名・項目・金額を自動で読み取って保存します。',
      '蓄積したデータは車種区分ごとに集計され、「軽自動車のオイル交換の相場」のような比較表としていつでも確認できます。',
    ],
  },
]

export default function ManualPage() {
  return (
    <main>
      <PageHero
        eyebrow="MANUAL"
        title="操作マニュアル"
        description="「ガレージ・カルテ」の主な機能の使い方を、実際の画面とともにご紹介します。導入前のイメージづくりにお役立てください。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 md:px-6 md:gap-24">
          {sections.map((section, index) => {
            const reversed = index % 2 === 1
            return (
              <div
                key={section.id}
                id={section.id}
                className="grid scroll-mt-24 items-center gap-10 md:grid-cols-2 md:gap-14"
              >
                <Reveal direction={reversed ? 'right' : 'left'} className={cn(reversed && 'md:order-2')}>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <section.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-2xl font-black tracking-tight">{section.title}</h2>
                  <ul className="mt-5 space-y-3">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span className="text-sm leading-relaxed text-foreground/90">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>

                {section.image && (
                  <Reveal
                    direction={reversed ? 'left' : 'right'}
                    delay={0.1}
                    className={cn(reversed && 'md:order-1')}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                      <Image
                        src={section.image}
                        alt={`${section.title}の画面イメージ`}
                        fill
                        className="object-cover object-top"
                      />
                    </div>
                  </Reveal>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-t border-border bg-muted/60 py-16 md:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center md:px-6">
          <h2 className="text-balance text-2xl font-black tracking-tight md:text-3xl">
            もっと詳しく知りたい方へ
          </h2>
          <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground">
            よくあるご質問や、導入前のご相談はサポートページ・お問い合わせから承っております。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/support"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              よくあるご質問を見る
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-6 text-base font-bold transition-colors hover:bg-muted"
            >
              資料請求・お問い合わせ
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
