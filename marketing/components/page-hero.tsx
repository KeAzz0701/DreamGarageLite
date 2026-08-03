'use client'

import { motion } from 'framer-motion'

const EASE = [0.21, 0.47, 0.32, 0.98] as const

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/60">
      {/* トップページと同じ「黒画面から浮き出る」導入演出をサブページにも適用 */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[#0a0a0b]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      />

      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <motion.p
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          className="text-sm font-bold tracking-wide text-primary"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
          className="mt-3 text-balance text-3xl font-black tracking-tight md:text-5xl"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
          className="mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground md:text-lg"
        >
          {description}
        </motion.p>
      </div>
    </section>
  )
}