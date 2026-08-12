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

/** 実機のスマートフォンのような縦長の外枠(ベゼル・ノッチ・ホームインジケーター)。中身はabsolute埋めで渡す */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="relative w-full max-w-[300px] rounded-[2.75rem] bg-neutral-900 p-3 shadow-2xl ring-1 ring-black/10">
        {/* 側面ボタン風の飾り */}
        <div className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l bg-neutral-800" aria-hidden="true" />
        <div className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-neutral-800" aria-hidden="true" />
        <div className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-neutral-800" aria-hidden="true" />

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-neutral-100">
          {/* ノッチ */}
          <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-900" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center">{children}</div>
          {/* ホームインジケーター */}
          <div className="absolute bottom-1.5 left-1/2 z-10 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-400/70" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
