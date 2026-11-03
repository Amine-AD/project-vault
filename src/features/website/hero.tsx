import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { useVault } from '#/context/VaultContext'
import { VaultPreview } from './vault-preview'

const IMPORT_SOURCES = ['1Password', 'Bitwarden', 'LastPass', 'Chrome']

export function Hero() {
  const { user } = useVault()

  return (
    <section className="relative overflow-hidden px-5 pt-16 pb-10 md:px-10 md:pt-24 md:pb-14">
      <div className="mx-auto max-w-4xl space-y-8 text-center">
        <h1 className="text-balance font-display font-bold text-5xl leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
          Every password. <span className="text-primary-ink">One vault.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
          A zero-knowledge password manager you can host yourself. Everything is
          encrypted in your browser, so not even the server can read it.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-12 px-7 text-base" pill>
            <Link to={user ? '/app' : '/sign-up'}>
              {user ? 'Open your vault' : 'Create your vault'}
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 px-7 text-base"
            pill
            variant="outline"
          >
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </div>

      <VaultPreview />

      <div className="mx-auto mt-20 flex max-w-4xl flex-col items-center gap-5">
        <p className="text-muted-foreground text-sm">
          Bring your passwords from
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {IMPORT_SOURCES.map((name) => (
            <span
              className="font-display font-semibold text-muted-foreground/70 text-xl"
              key={name}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
