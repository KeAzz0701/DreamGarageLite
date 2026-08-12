import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Feature } from '@/lib/features'

/**
 * 機能紹介の各項目に添える画像/動画。実機のスマートフォン本体のような縦長フレーム
 * (ベゼル・ノッチ・ホームインジケーター)の中に、実際のアプリ画面のスクリーンショットを収める。
 * mediaSrcは実機のスマホ幅ブラウザで撮影した本物のスクリーンショット(概ね0.57〜0.72の
 * 縦長比率)を指しているため、object-containでも余白がほぼ出ず全体を大きく表示できる。
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

/**
 * 実機のスマートフォンのような縦長の外枠(金属エッジ・ダイナミックアイランド・ステータスバー・ホームインジケーター)。
 * ステータスバー/ホームインジケーターは画像に重ねず専用の帯として確保することで、
 * アプリ側の見出しやボタンと視覚的に衝突しないようにしている。中身はabsolute埋めで渡す
 */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="relative w-full max-w-[260px] rounded-[3rem] bg-gradient-to-b from-neutral-700 to-neutral-900 p-[3px] shadow-2xl">
        {/* 側面ボタン */}
        <div className="absolute -left-[2px] top-20 h-6 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -left-[2px] top-28 h-10 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -left-[2px] top-40 h-10 w-[2px] rounded-l bg-neutral-600" aria-hidden="true" />
        <div className="absolute -right-[2px] top-32 h-14 w-[2px] rounded-r bg-neutral-600" aria-hidden="true" />

        <div className="flex flex-col overflow-hidden rounded-[2.85rem] bg-black p-2">
          {/* ステータスバー(専用の帯。画像とは重ねない) */}
          <div className="relative flex h-8 shrink-0 items-center justify-between rounded-t-[2.4rem] bg-neutral-100 px-7 text-[11px] font-semibold text-neutral-900">
            <span>9:41</span>
            <div className="flex items-center gap-1 text-[10px]">
              <span aria-hidden="true">📶</span>
              <span aria-hidden="true">🔋</span>
            </div>
            {/* ダイナミックアイランド */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" aria-hidden="true" />
          </div>

          <div className="relative aspect-[1/2] w-full overflow-hidden bg-neutral-100">{children}</div>

          {/* ホームインジケーター(専用の帯) */}
          <div className="flex h-6 shrink-0 items-center justify-center rounded-b-[2.4rem] bg-neutral-100">
            <div className="h-1 w-28 rounded-full bg-neutral-900/60" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
