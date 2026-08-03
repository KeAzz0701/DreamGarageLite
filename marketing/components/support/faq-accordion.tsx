'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FaqItem = {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`
        const buttonId = `faq-button-${index}`
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-muted/50 md:px-6"
              >
                <span className="flex items-start gap-3">
                  <span className="font-black text-primary">Q.</span>
                  <span className="text-base font-bold leading-relaxed">{item.question}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-6 md:px-6"
            >
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                <span className="font-black text-foreground/70">A.</span>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
