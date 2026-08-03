'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type Direction = 'up' | 'left' | 'right'

const DISTANCE = 32

function variantsFor(direction: Direction): Variants {
  const offset =
    direction === 'up'
      ? { y: DISTANCE }
      : direction === 'left'
        ? { x: -DISTANCE }
        : { x: DISTANCE }

  return {
    hidden: { opacity: 0, ...offset },
    visible: { opacity: 1, x: 0, y: 0 },
  }
}

/**
 * スクロールで画面に入ったタイミングでフェード+スライドしながら表れる。
 * 一度表示したら再度隠れても再アニメーションしない(スクロールでチラつかせないため)。
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className,
}: {
  children: ReactNode
  direction?: Direction
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={variantsFor(direction)}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * 子要素を順番にstagger(時間差)で登場させる。見出し+複数カードの並びなどに使う
 */
export function RevealGroup({
  children,
  direction = 'up',
  staggerDelay = 0.1,
  className,
}: {
  children: ReactNode
  direction?: Direction
  staggerDelay?: number
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={variantsFor(direction)} transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}