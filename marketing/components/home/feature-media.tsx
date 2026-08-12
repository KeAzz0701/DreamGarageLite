import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Feature } from '@/lib/features'

/**
 * 機能紹介の各項目に添える画像/動画。実機のスマートフォン本体のような縦長フレーム
 * (ベゼル・ノッチ・ホームインジケーター)の中に、実際のアプリ画面のスクリーンショットを収める。
 * mediaSrcはPCスクリーンショットからサイドバー・上部ナビを除いて縦長(概ね9:10)に
 * 切り出し済みの画像を指しているため、object-containでも余白がほぼ出ず全体を大きく表示できる。
 * mediaSrcが未設定の間はプレースホルダー枠を表示し、動画(mediaType:'video')は
 * 自動再生・ループ・ミュートで、実際に操作しているような短い動きを見せる想定。
 */
export function FeatureMedia({ feature }: { feature: Feature }) {
  if (feature.mediaType === 'video' && feature.mediaSrc) {
    return (
      <PhoneFrame>
        <video
          src={feature.mediaSrc}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      </PhoneFrame>
    )
  }

  if (feature.mediaType === 'image' && feature.mediaSrc) {
    return (
      <PhoneFrame>
        <Image
          src={feature.mediaSrc}
          alt={`${feature.title}の画面イメージ`}
          fill
          sizes="(min-width: 768px) 320px, 80vw"
          className="object-contain"
        />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/60 text-muted-foreground">
        <ImageIcon className="size-8" aria-hidden="true" />
        <p className="mt-2 text-xs font-medium">スクリーンショット・動画</p>
        <p className="mt-1 px-4 text-center text-[11px]">{feature.title}の画面イメージ</p>
      </div>
    </PhoneFrame>
  )
}

/** 実機のスマートフォンのような縦長の外枠(金属エッジ・ダイナミックアイランド・ステータスバー・ホームインジケーター)。中身はabsolute埋めで渡す */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="relative w-full max-w-[280px] rounded-[3rem] bg-gradient-to-b from-neutral-700 to-neutral-900 p-[3px] shadow-2xl">
        {/* 側面ボタン */}
        <div className="absolute -left-[2px] top-20 h-6 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -left-[2px] top-28 h-10 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -left-[2px] top-40 h-10 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -right-[2px] top-32 h-14 w-[2px] rounded-r bg-neutral-600" aria-hidden="true" />

        <div className="rounded-[2.85rem] bg-black p-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.4rem] bg-neutral-100">
            {children}

            {/* ステータスバー(画像の上に重ねる) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between bg-gradient-to-b from-white/90 to-white/0 px-6 text-[11px] font-semibold text-neutral-900">
              <span>9:41</span>
              <div className="flex items-center gap-1 text-[10px]">
                <span aria-hidden="true">📶</span>
                <span aria-hidden="true">🔋</span>
              </div>
            </div>
            {/* ダイナミックアイランド */}
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />

            {/* ホームインジケーター */}
            <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 h-1 w-28 -translate-x-1/2 rounded-full bg-neutral-900/60" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
