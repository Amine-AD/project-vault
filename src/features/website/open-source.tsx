import { ArrowUpRightIcon } from 'lucide-react'
import { GitHubIcon } from '#/components/GitHubIcon'
import { Button } from '#/components/ui/button'
import { SectionHeading } from './components/section-heading'
import { Sticker } from './components/sticker'
import { LEGAL } from './legal/legal-info'

/** What protects a vault, as plain facts anyone can check in the code. */
const SPEC: [string, string][] = [
  ['Key derivation', 'Argon2id · 64 MiB'],
  ['Encryption', 'AES-256-GCM'],
  ['Vault key', 'Random, made in your browser'],
  ['Server stores', 'Ciphertext only'],
  ['If you forget', 'Recovery kit or trusted device'],
  ['License', LEGAL.license],
]

const SECURITY_URL = `${LEGAL.sourceCodeUrl}/blob/main/SECURITY.md`

/**
 * Trust section: the code is public, so the claims above can be checked.
 * The spec sheet reads like a product label, with a sticker on its corner.
 */
export function OpenSource() {
  return (
    <section
      className="scroll-mt-20 px-5 py-14 md:px-10 md:py-20"
      id="open-source"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="space-y-8">
          <SectionHeading
            title="Don't trust us. Read the code."
            description={`OneVault is open source under the ${LEGAL.license} license. Every line that touches your passwords is public, so you can check what it does instead of taking our word for it.`}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-7 text-base" pill>
              <a href={LEGAL.sourceCodeUrl} rel="noreferrer" target="_blank">
                <GitHubIcon className="size-5" />
                View on GitHub
              </a>
            </Button>
            <Button
              asChild
              className="h-12 px-7 text-base"
              pill
              variant="outline"
            >
              <a href={SECURITY_URL} rel="noreferrer" target="_blank">
                How the encryption works
                <ArrowUpRightIcon />
              </a>
            </Button>
          </div>
        </div>

        <div className="relative">
          <Sticker className="-top-4 right-8" color="lime" tilt={5}>
            Check it yourself
          </Sticker>
          <dl className="rotate-1 rounded-[2rem] bg-card p-7 shadow-xl ring-1 ring-border md:p-9">
            <div className="flex items-baseline justify-between border-b-2 border-foreground pb-4">
              <span className="font-display font-bold text-2xl">
                What's inside
              </span>
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
                Per vault
              </span>
            </div>
            {SPEC.map(([label, value]) => (
              <div
                className="flex items-baseline justify-between gap-6 border-b border-dashed py-3.5 last:border-b-0 last:pb-0"
                key={label}
              >
                <dt className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
                  {label}
                </dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
