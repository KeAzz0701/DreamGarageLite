import type { Metadata } from 'next'
import { Phone, Clock, FileText } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { ContactForm } from '@/components/contact/contact-form'
import { Reveal } from '@/components/motion/reveal'

export const metadata: Metadata = {
  title: 'お問い合わせ・資料請求',
  description:
    '「ガレージ・カルテ」への資料請求・お問い合わせはこちら。導入のご相談、オンラインデモのご依頼も承っております。',
}

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="CONTACT"
        title="お問い合わせ・資料請求"
        description="導入のご相談、お見積り、資料請求などお気軽にお問い合わせください。2営業日以内に担当者よりご連絡いたします。"
      />

      <section className="bg-background py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-5 md:px-6">
          <Reveal direction="left" className="md:col-span-2">
            <h2 className="text-xl font-black tracking-tight">お問い合わせ方法</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              フォームのほか、お電話でもご相談を承っております。まずはお気軽にご連絡ください。
            </p>

            <ul className="mt-8 space-y-6">
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">お電話</p>
                  <a href="tel:0000000000" className="mt-1 block text-xl font-black text-primary">
                    00-0000-0000
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">受付時間</p>
                  <p className="mt-1 text-sm text-muted-foreground">平日 9:00〜18:00（土日祝を除く）</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">資料請求</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    フォームの内容欄に「資料請求希望」とご記入ください。
                  </p>
                </div>
              </li>
            </ul>
          </Reveal>

          <Reveal direction="right" delay={0.1} className="md:col-span-3">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
