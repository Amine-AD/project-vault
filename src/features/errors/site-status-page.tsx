import { Link, useRouter } from '@tanstack/react-router'
import type React from 'react'
import { BrandLogo, LogoMarkStacked } from '#/components/BrandLogo'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import { useVault } from '#/context/VaultContext'
import { Sticker } from '#/features/website/components/sticker'
import { ErrorDetails } from './error-details'

/**
 * Full-page status screen in the website's style: the tilted brand mark with
 * security stickers (like the landing page CTA), a display headline and pill
 * buttons. Used outside the app (landing, sign-in, unknown URLs).
 */
function SiteStatusPage({
  code,
  label,
  title,
  description,
  children,
  details,
}: {
  code: string
  label: string
  title: string
  description: string
  children: React.ReactNode
  /** Shown under the buttons, e.g. error details in development. */
  details?: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 md:px-10">
        <Link className="rounded-lg" to="/">
          <BrandLogo />
        </Link>
        <ThemeToggle />
      </header>

      <section className="flex flex-1 items-center px-5 pt-6 pb-16 md:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-14 md:grid-cols-[1fr_auto] md:gap-10">
          <div className="flex flex-col items-center gap-8 text-center md:items-start md:text-start">
            <p className="font-mono font-semibold text-muted-foreground text-sm uppercase tracking-[0.12em]">
              Error {code}
            </p>
            <div className="space-y-5">
              <h1 className="text-balance font-display font-bold text-5xl leading-[1.02] tracking-tight sm:text-6xl">
                {title}
              </h1>
              <p className="max-w-xl text-balance text-lg text-muted-foreground md:text-xl">
                {description}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {children}
            </div>
            {details}
          </div>

          <StatusMark code={code} label={label} />
        </div>
      </section>
    </div>
  )
}

/** The landing CTA's tilted keyhole, tagged with the status code. */
function StatusMark({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex justify-center py-6 md:px-16">
      <div
        aria-hidden
        className="relative h-[172px] w-[180px] md:h-[220px] md:w-[230px]"
      >
        <LogoMarkStacked
          back="#d4f34a"
          className="size-full -rotate-6"
          disc="var(--primary)"
          keyhole="#ffffff"
        />
        <Sticker
          className="-top-7 -right-10 size-[84px] text-lg md:size-[100px] md:text-xl"
          color="lime"
          shape="round"
          tilt={8}
        >
          {code}
        </Sticker>
        <Sticker className="-bottom-3 -right-12" color="paper" tilt={-5}>
          {label}
        </Sticker>
        <Sticker className="bottom-10 -left-16" color="ink" tilt={4}>
          Still encrypted
        </Sticker>
      </div>
    </div>
  )
}

const PILL = 'h-12 px-7 text-base'

/** Unknown URL outside the app. */
export function SiteNotFound() {
  const { user } = useVault()

  return (
    <SiteStatusPage
      code="404"
      description="The link may be old or mistyped. Nothing was opened, and your vault is exactly as you left it."
      label="Not found"
      title="This page isn’t in the vault"
    >
      <Button asChild className={PILL} pill>
        <Link to="/">Back to home</Link>
      </Button>
      <Button asChild className={PILL} pill variant="outline">
        <Link to={user ? '/app' : '/login'}>
          {user ? 'Open your vault' : 'Sign in'}
        </Link>
      </Button>
    </SiteStatusPage>
  )
}

/** Unexpected error outside the app. */
export function SiteError({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}) {
  const router = useRouter()

  return (
    <SiteStatusPage
      code="500"
      details={<ErrorDetails error={error} />}
      description="We hit an unexpected error. Your vault is still encrypted and safe. Try again in a moment."
      label="Server hiccup"
      title="Something went wrong on our side"
    >
      <Button
        className={PILL}
        onClick={() => {
          reset()
          router.invalidate()
        }}
        pill
      >
        Try again
      </Button>
      <Button asChild className={PILL} pill variant="outline">
        <Link to="/">Back to home</Link>
      </Button>
    </SiteStatusPage>
  )
}
