'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EASE = [0.21, 0.47, 0.32, 0.98] as const

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* 開いた瞬間、黒い画面からコンテンツが浮き出てくる導入演出。一度だけ再生 */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[#0a0a0b]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        style={{ willChange: 'opacity' }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <div className="flex flex-col">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            整備工場向けクラウド管理システム
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="mt-5 text-balance text-4xl font-black leading-[1.15] tracking-tight md:text-5xl lg:text-6xl"
          >
            整備工場のカルテ、
            <br />
            <span className="text-primary">まるごとデジタル化。</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
            className="mt-6 max-w-md text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            顧客・車両情報の管理から、予約・見積、LINEでの点検リマインドまで。
            「ガレージ・カルテ」が、町工場の毎日の業務をシンプルにまとめます。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              size="lg"
              nativeButton={false}
              className="h-12 px-6 text-base font-bold"
              render={
                <Link href="/contact" data-icon="inline-end">
                  資料請求（無料）
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              className="h-12 px-4 text-base font-medium"
              render={
                <Link href="/features" data-icon="inline-start">
                  <PlayCircle className="size-5" />
                  使い方を見る
                </Link>
              }
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
            className="mt-5 text-xs text-muted-foreground"
          >
            導入相談・お見積りは無料です。まずはお気軽にお問い合わせください。
          </motion.p>
        </div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <Image
              src="/hero-garage.png"
              alt="タブレットで整備工場の管理システムを操作する整備士"
              width={720}
              height={560}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1, ease: EASE }}
            className="absolute -bottom-5 -left-4 hidden rounded-xl border border-border bg-card px-5 py-3 shadow-lg sm:block"
          >
            <p className="text-xs text-muted-foreground">点検リマインド送信数</p>
            <p className="text-2xl font-black text-primary">
              12,480<span className="ml-1 text-sm font-bold text-foreground">件/月</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}