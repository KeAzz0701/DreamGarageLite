import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Feature } from '@/lib/features'

/**
 * 機能紹介の各項目に添える画像/動画。素材が実際はPC画面のスクリーンショットのため、
 * 携帯フレームではなくブラウザウィンドウ風の枠(信号機ボタン・アドレスバー)に収める。
 * 枠の縦横比を素材の実寸に近い4:3にしているので、object-containでも余白(レターボックス)
 * がほぼ出ず、画面全体を大きく見せられる。
 * mediaSrcが未設定の間はプレースホルダー枠を表示し、動画(mediaType:'video')は
 * 自動再生・ループ・ミュートで、実際に操作しているような短い動きを見せる想定。
 */
export function FeatureMedia({ feature }: { feature: Feature }) {
  if (feature.mediaType === 'video' && feature.mediaSrc) {
    return (
      <BrowserFrame>
        <video
          src={feature.mediaSrc}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      </BrowserFrame>
    )
  }

  if (feature.mediaType === 'image' && feature.mediaSrc) {
    return (
      <BrowserFrame>
        <Image
          src={feature.mediaSrc}
          alt={`${feature.title}の画面イメージ`}
          fill
          sizes="(min-width: 768px) 480px, 90vw"
          className="object-contain"
        />
      </BrowserFrame>
    )
  }

  return (
    <BrowserFrame>
      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/60 text-muted-foreground">
        <ImageIcon className="size-8" aria-hidden="true" />
        <p className="mt-2 text-xs font-medium">スクリーンショット・動画</p>
        <p className="mt-1 px-4 text-center text-[11px]">{feature.title}の画面イメージ</p>
      </div>
    </BrowserFrame>
  )
}

/** ブラウザウィンドウ風の外枠(信号機ボタン・アドレスバー)。中身はabsolute埋めで渡す */
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="w-full max-w-[480px] overflow-hidden rounded-xl bg-neutral-900 shadow-2xl ring-1 ring-black/10">
        {/* タイトルバー */}
        <div className="flex items-center gap-3 bg-neutral-800 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-green-400" aria-hidden="true" />
          </div>
          <div className="flex-1 truncate rounded-full bg-neutral-700 px-3 py-1 text-center text-[11px] text-neutral-300">
            app.dreamgaragelite.com
          </div>
        </div>

        <div className="relative aspect-[4/3] w-full bg-neutral-100">{children}</div>
      </div>
    </div>
  )
}
