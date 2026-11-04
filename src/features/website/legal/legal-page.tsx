import { Link } from '@tanstack/react-router'
import type React from 'react'
import { SiteFooter } from '../site-footer'
import { SiteHeader } from '../site-header'
import { LEGAL } from './legal-info'

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

/**
 * Long-form legal document in the website's style: site header and footer,
 * a display title, an "On this page" list (sticky beside the text on wide
 * screens) and numbered sections.
 */
export function LegalPage({
  title,
  intro,
  sections,
  otherPage,
}: {
  title: string
  intro: React.ReactNode
  sections: LegalSection[]
  otherPage: { to: '/privacy' | '/terms'; label: string }
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-12 pb-24 md:px-10 md:pt-20">
        <header className="max-w-3xl space-y-5">
          <p className="font-mono font-semibold text-muted-foreground text-sm uppercase tracking-[0.12em]">
            Legal
          </p>
          <h1 className="text-balance font-display font-bold text-5xl leading-[1.02] tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Last updated {LEGAL.lastUpdated}
          </p>
          <div className="text-lg text-muted-foreground leading-relaxed">
            {intro}
          </div>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <nav
            aria-label="On this page"
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <p className="mb-3 font-medium text-sm">On this page</p>
            <ol className="space-y-2 text-muted-foreground text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    className="transition-colors hover:text-foreground"
                    href={`#${section.id}`}
                  >
                    {i + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-muted-foreground text-sm">
              See also:{' '}
              <Link className="text-foreground underline" to={otherPage.to}>
                {otherPage.label}
              </Link>
            </p>
          </nav>

          <article className="max-w-3xl space-y-12">
            {sections.map((section, i) => (
              <section
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-28 space-y-4"
                id={section.id}
                key={section.id}
              >
                <h2
                  className="font-display font-semibold text-2xl tracking-tight"
                  id={`${section.id}-title`}
                >
                  <span className="text-muted-foreground">{i + 1}.</span>{' '}
                  {section.title}
                </h2>
                <div className="space-y-4 text-base text-foreground/85 leading-relaxed [&_a]:text-foreground [&_a]:underline [&_strong]:font-semibold [&_strong]:text-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

/** A bulleted list for legal sections. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5 marker:text-muted-foreground">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static content
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
