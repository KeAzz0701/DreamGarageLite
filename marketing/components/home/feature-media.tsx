import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Feature } from '@/lib/features'

/**
 * 機能紹介の各項目に添える画像/動画。mediaSrcが未設定の間はプレースホルダー枠を表示し、
 * 動画(mediaType:'video')は自動再生・ループ・ミュートで、実際に操作しているような
 * 短い動きを見せる想定(依頼: 静止画ではなく少し動く動画にしたい)
 */
export function FeatureMedia({ feature }: { feature: Feature }) {
  if (feature.mediaType === 'video' && feature.mediaSrc) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <video
          src={feature.mediaSrc}
          autoPlay
          loop
          muted
          playsInline
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
    )
  }

  if (feature.mediaType === 'image' && feature.mediaSrc) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <Image
          src={feature.mediaSrc}
          alt={`${feature.title}の画面イメージ`}
          width={720}
          height={540}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/60 text-muted-foreground">
      <ImageIcon className="size-10" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">スクリーンショット・動画</p>
      <p className="mt-1 text-xs">{feature.title}の画面イメージ</p>
    </div>
  )
}
