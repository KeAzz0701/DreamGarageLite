import { Users, MessageCircle, CalendarCheck, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Feature = {
  id: string
  icon: LucideIcon
  title: string
  short: string
  description: string
  points: string[]
  // 機能紹介ページの右側(交互に左右)に出す画像・動画。未指定の間はプレースホルダー枠を表示する。
  // 操作イメージが伝わりやすいよう、可能なら動画(mediaType:'video')を推奨
  mediaType?: 'image' | 'video'
  mediaSrc?: string
}

export const features: Feature[] = [
  {
    id: 'customers',
    icon: Users,
    title: '顧客・車両管理',
    short: 'お客様と車両の情報をカルテとして一元管理。',
    description:
      'お客様の連絡先や車両情報、整備履歴をまとめて記録。車検証の内容や次回点検時期もひと目で確認でき、担当者が変わっても引き継ぎがスムーズです。',
    points: ['車両ごとの整備履歴を時系列で記録', '車検・点検の満了日を自動で管理', 'お客様情報から過去の作業をすぐ検索'],
    mediaType: 'image',
    mediaSrc: '/manual/customers-portrait.png',
  },
  {
    id: 'line',
    icon: MessageCircle,
    title: 'LINE連携リマインド',
    short: '車検・点検の案内をLINEで自動送信。',
    description:
      '面倒だったハガキや電話でのご案内を、LINEで自動送信。車検や定期点検のタイミングをお客様にお知らせし、再来店につなげます。',
    points: ['車検・点検時期に合わせて自動配信', 'テンプレートで文面を簡単作成', '開封・予約状況をダッシュボードで確認'],
    mediaType: 'image',
    mediaSrc: '/manual/line-portrait.png',
  },
  {
    id: 'reservation',
    icon: CalendarCheck,
    title: '予約管理',
    short: 'ピット状況を見ながら予約をかんたん調整。',
    description:
      '入庫予約をカレンダーで管理。作業内容や担当者、ピットの空き状況を見ながら、電話やLINEからの予約をその場で登録できます。',
    points: ['カレンダーで一日の入庫予定を把握', 'ダブルブッキングを防止', 'スマホからいつでも予約を確認・変更'],
    // mediaSrc temporarily removed: the screenshot contained a real customer name not
    // present in the demo seed data (2026-08-18 incident). Falls back to placeholder
    // until a clean re-capture from the demo0001 account replaces it.
  },
  {
    id: 'estimate',
    icon: FileText,
    title: '見積作成',
    short: '整備メニューから見積・請求書をすばやく作成。',
    description:
      'よく使う整備メニューや部品を登録しておけば、選ぶだけで見積書を作成。そのまま作業指示や請求へ連携でき、転記の手間を減らします。',
    points: ['整備メニュー・部品の登録で入力を効率化', '見積から請求書までワンストップ', 'PDFで発行してそのまま送付'],
    // mediaSrc temporarily removed: the screenshot contained real customer names not
    // present in the demo seed data (2026-08-18 incident). Falls back to placeholder
    // until a clean re-capture from the demo0001 account replaces it.
  },
]
