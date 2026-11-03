import { Dialog as ArkDialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  EqualIcon,
  XIcon,
} from 'lucide-react'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { BrandWordmark } from '#/components/BrandLogo'
import { ThemeToggle } from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetPositioner,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { cn } from '#/lib/utils'
import { WhitePillButton } from './components/pill-link'

interface MobileMenuProps {
  nav: { href: string; label: string }[]
  signedIn: boolean
}

/** The breakpoint where the inline header nav takes over. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Ondeck-style full-screen menu for small screens: a solid cobalt sheet with
 * big display links, the main CTA and the appearance switch.
 */
export function MobileMenu({ nav, signedIn }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  // Section to scroll to once the sheet has closed and released the scroll lock.
  const pendingHash = useRef<string | null>(null)

  // Close if the viewport grows into the desktop layout while open.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => media.matches && setOpen(false)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const goTo = (event: MouseEvent, href: string) => {
    event.preventDefault()
    pendingHash.current = href
    setOpen(false)
  }

  const onExitComplete = () => {
    const hash = pendingHash.current
    pendingHash.current = null
    if (!hash) return
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
    window.history.replaceState(null, '', hash)
  }

  return (
    <Sheet
      onExitComplete={onExitComplete}
      onOpenChange={({ open }) => setOpen(open)}
      open={open}
    >
      <SheetTrigger asChild>
        <Button
          aria-label="Open menu"
          className="size-11 md:hidden"
          pill
          size="icon-xl"
          variant="outline"
        >
          <EqualIcon />
        </Button>
      </SheetTrigger>

      <Portal>
        <SheetPositioner placement="left">
          <ArkDialog.Content
            className={cn(
              'flex size-full flex-col overflow-y-auto bg-primary text-white outline-none',
              'duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4',
              'motion-reduce:animate-none!',
            )}
            data-slot="sheet-content"
          >
            <div className="flex h-18 shrink-0 items-center justify-between px-5">
              <BrandWordmark
                className="text-xl"
                markDisc="#ffffff"
                markKeyhole="var(--primary)"
              />
              <SheetClose asChild>
                <Button
                  aria-label="Close menu"
                  className="size-11 border-0 bg-white text-primary shadow-none hover:bg-brand-lime hover:text-brand-ink"
                  pill
                  size="icon-xl"
                >
                  <XIcon />
                </Button>
              </SheetClose>
            </div>

            <SheetTitle className="sr-only">Menu</SheetTitle>

            <nav className="flex flex-col px-5 pt-6">
              {nav.map((item, index) => (
                <a
                  className="group flex items-center justify-between border-white/20 border-b py-4 outline-none focus-visible:text-brand-lime"
                  href={item.href}
                  key={item.href}
                  onClick={(event) => goTo(event, item.href)}
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-white/55 text-xs">
                      0{index + 1}
                    </span>
                    <span className="font-display font-semibold text-[2.5rem] leading-none tracking-[-0.03em] transition-colors group-hover:text-brand-lime">
                      {item.label}
                    </span>
                  </span>
                  <ArrowUpRightIcon className="size-6 text-white/55 transition-[color,rotate] group-hover:rotate-45 group-hover:text-brand-lime" />
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-6 px-5 pt-12 pb-8">
              <p className="flex items-center gap-2 font-mono text-white/75 text-xs uppercase tracking-[0.08em]">
                <span className="size-2 rounded-full bg-brand-lime" />
                Zero-knowledge · Self-hostable
              </p>

              <div className="flex flex-col gap-3">
                <WhitePillButton className="w-full justify-center">
                  {signedIn ? (
                    <Link onClick={() => setOpen(false)} to="/app">
                      Open vault
                      <ArrowRightIcon />
                    </Link>
                  ) : (
                    <Link onClick={() => setOpen(false)} to="/sign-up">
                      Get started — it's free
                    </Link>
                  )}
                </WhitePillButton>
                {!signedIn && (
                  <Button
                    asChild
                    className="h-auto w-full justify-center rounded-full border-white/40 bg-transparent py-[17px] font-semibold text-base text-white leading-[22px] shadow-none hover:bg-white/10"
                    variant="outline"
                  >
                    <Link onClick={() => setOpen(false)} to="/login">
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between border-white/20 border-t pt-6">
                <span className="font-mono text-white/75 text-xs uppercase tracking-[0.08em]">
                  Appearance
                </span>
                <ThemeToggle tone="inverse" />
              </div>
            </div>
          </ArkDialog.Content>
        </SheetPositioner>
      </Portal>
    </Sheet>
  )
}
