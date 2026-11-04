import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { BrandLogo } from '#/components/BrandLogo'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import { useVault } from '#/context/VaultContext'
import { MobileMenu } from './mobile-menu'

const NAV = [
  // Absolute, so they also work from other pages (privacy, terms…)
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#self-host', label: 'Self-host' },
  { href: '/#faq', label: 'FAQ' },
]

/** Ondeck-sized header CTA: taller, wider and set in 16px. */
const CTA_CLASS = 'h-11 px-6 font-semibold text-base max-sm:h-10 max-sm:px-5'

export function SiteHeader() {
  const { user } = useVault()

  return (
    <header className="sticky top-0 z-40 border-transparent border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 md:px-10">
        <Link to="/" className="rounded-lg">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Button asChild key={item.href} pill size="lg" variant="ghost">
              <a href={item.href}>{item.label}</a>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="max-md:hidden" />
          {user ? (
            <Button asChild className={CTA_CLASS} pill size="xl">
              <Link to="/app">
                Open vault
                <ArrowRightIcon />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                className="h-11 px-5 font-semibold text-base max-md:hidden"
                pill
                size="xl"
                variant="ghost"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className={CTA_CLASS} pill size="xl">
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
          <MobileMenu nav={NAV} signedIn={!!user} />
        </div>
      </div>
    </header>
  )
}
