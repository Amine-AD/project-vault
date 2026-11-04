import { createFileRoute } from '@tanstack/react-router'
import { Cta } from '#/features/website/cta'
import { Faq } from '#/features/website/faq'
import { Features } from '#/features/website/features'
import { Hero } from '#/features/website/hero'
import { HowItWorks } from '#/features/website/how-it-works'
import { OpenSource } from '#/features/website/open-source'
import { SelfHost } from '#/features/website/self-host'
import { SiteFooter } from '#/features/website/site-footer'
import { SiteHeader } from '#/features/website/site-header'

export const Route = createFileRoute('/(website)/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <Features />
      <OpenSource />
      <SelfHost />
      <Faq />
      <Cta />
      <SiteFooter />
    </div>
  )
}
