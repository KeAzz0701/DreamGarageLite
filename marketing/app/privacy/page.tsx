import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { siteConfig } from '@/lib/site'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: `${siteConfig.productName}における個人情報の取り扱いについて`,
}

const sections = [
  {
    title: '1. 基本方針',
    body: `${siteConfig.companyName}(以下「当社」といいます)は、${siteConfig.productName}(以下「本サービス」といいます)の提供にあたりお預かりする個人情報を適切に取り扱うことが社会的責務であると認識し、以下の方針に基づき個人情報の保護に努めます。`,
  },
  {
    title: '2. 取得する情報',
    body: '本サービスのご利用にあたり、店舗ご担当者様の情報、サービス利用情報、顧客・車両・整備履歴、予約情報、OCRにアップロードいただいた画像と抽出結果、LINE連携情報、お問い合わせ内容および操作ログを取得・保存します。',
  },
  {
    title: '3. 利用目的',
    body: 'サービスの提供、本人確認、お問い合わせ対応、障害対応、安全管理、機能改善、利用状況の分析および必要なご通知のために利用します。',
  },
  {
    title: '4. 委託・外部サービス',
    body: '本サービスの提供のため、以下の外部サービスを利用しています。\n\n【LINEヤフー(LINE Messaging API・LINEログイン)】\n送信する情報: 顧客・スタッフ様のLINEユーザーID、送受信メッセージ本文、送信画像、顧客ポータルのログイン認証情報\n利用目的: LINEを通じた予約・整備履歴のご案内、リマインド通知、顧客ポータルへのログイン\n\n【Google(Gemini API)】\n送信する情報: 車検証・他店見積書等のアップロード画像、AIチャットに入力された業務データ(予約・顧客・車両情報を含む)\n利用目的: 車検証OCRの読み取り、AIチャットの応答、車検法定費用の概算算出\n\n【Google(Google Calendar API)】\n送信する情報: 予約日時等の予約情報\n利用目的: ご利用店舗様が連携を設定された場合の、予約情報のGoogleカレンダー同期\n\n【OpenRouter(AI応答生成)】\n送信する情報: AIチャットの会話履歴・業務データ\n利用目的: Gemini APIの代替経路としてのAIチャット応答生成\n\nホスティングはさくらインターネット株式会社のVPS上で自社運用しており、上記以外の外部クラウド基盤へのデータ送信は行っておりません。決済代行サービスは現時点では利用していません。今後、決済・メール送信等の外部サービスを追加導入する場合は、本ポリシーを更新のうえご案内します。',
  },
  {
    title: '5. 第三者提供',
    body: '取得した個人情報は、法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。',
  },
  {
    title: '6. 保存期間',
    body: '取得した情報は、サービス提供に必要な期間保存します。ご利用契約が終了(解約)した場合、法令上保存が必要な情報を除き、解約日から30日以内に削除します。',
  },
  {
    title: '7. 安全管理',
    body: 'アクセス権限の管理、通信の保護、ログ管理その他、取り扱う情報の性質に応じた安全管理措置を講じます。',
  },
  {
    title: '8. 個人情報の開示・訂正・利用停止・削除',
    body: 'ご本人からの保有個人データに関する開示、訂正、利用停止、削除および苦情については、下記お問い合わせ窓口にて対応いたします。',
  },
  {
    title: '9. お問い合わせ窓口',
    body: `${siteConfig.companyName}\nEmail: info@dreamgaragelite.com`,
  },
  {
    title: '10. 本ポリシーの変更',
    body: '本ポリシーの内容は、法令の変更その他の事由により、予告なく変更することがあります。変更後のプライバシーポリシーは、本サービス上に掲載した時点から効力を生じるものとします。',
  },
]

export default function PrivacyPage() {
  return (
    <main>
      <PageHero
        eyebrow="PRIVACY"
        title="プライバシーポリシー"
        description={`${siteConfig.productName}における個人情報の取り扱いについてご案内します。`}
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
