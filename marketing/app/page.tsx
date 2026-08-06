import { Hero } from '@/components/home/hero'
import { FeatureHighlights } from '@/components/home/feature-highlights'
import { Pricing } from '@/components/home/pricing'
import { Steps } from '@/components/home/steps'
import { FinalCta } from '@/components/home/final-cta'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeatureHighlights />
      <Pricing />
      <Steps />
      <FinalCta />
    </main>
  )
}
