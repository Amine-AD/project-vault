import { KeyRoundIcon, LockIcon } from 'lucide-react'
import type React from 'react'
import { SectionHeading } from './components/section-heading'
import { Sticker } from './components/sticker'

const STEPS: {
  title: string
  description: string
  visual: React.ReactNode
}[] = [
  {
    title: 'Create',
    description:
      'Pick a master password. Your browser runs it through Argon2id to make two keys: one proves it’s you, one unlocks your vault. The password itself is never sent.',
    visual: (
      <>
        <Sticker className="-top-3 right-6" color="lime" tilt={5}>
          Never sent
        </Sticker>
        <div className="w-full max-w-60 -rotate-2 space-y-2 rounded-2xl border bg-background p-4 shadow-lg">
          <div className="text-muted-foreground text-xs">Master password</div>
          <div className="font-mono text-lg tracking-widest">••••••••••••</div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span className="h-1 flex-1 rounded-full bg-success" key={i} />
            ))}
          </div>
        </div>
      </>
    ),
  },
  {
    title: 'Save',
    description:
      'Add logins, 2FA secrets and notes. Each item is sealed with AES-256-GCM before it leaves your device.',
    visual: (
      <div className="w-full max-w-60 space-y-2">
        <div className="flex items-center gap-2 rounded-2xl border bg-background p-3 shadow-sm">
          <KeyRoundIcon className="size-4 text-primary-ink" />
          <span className="font-medium text-sm">Figma</span>
        </div>
        <div className="flex rotate-2 items-center gap-2 rounded-2xl bg-primary p-3 text-white shadow-lg">
          <KeyRoundIcon className="size-4" />
          <span className="font-medium text-sm">Stripe dashboard</span>
        </div>
        <div className="rounded-2xl border border-dashed p-3 text-muted-foreground text-sm">
          + Add an item
        </div>
      </div>
    ),
  },
  {
    title: 'Unlock',
    description:
      'Your vault decrypts in memory when you unlock it, and locks itself again when you walk away.',
    visual: (
      <>
        <Sticker className="right-4 -bottom-3" color="paper" tilt={-4}>
          Auto-locks
        </Sticker>
        <div className="flex w-full max-w-60 rotate-1 flex-col items-center gap-3 rounded-2xl border bg-background p-5 shadow-lg">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
            <LockIcon className="size-4" />
          </span>
          <span className="font-semibold text-sm">Vault locked</span>
          <span className="text-muted-foreground text-xs">
            after 15 min idle
          </span>
        </div>
      </>
    ),
  },
]

export function HowItWorks() {
  return (
    <section
      className="scroll-mt-20 px-5 py-14 md:px-10 md:py-20"
      id="how-it-works"
    >
      <div className="mx-auto max-w-7xl space-y-12">
        <SectionHeading
          title="How OneVault works"
          description="Your master password never leaves your browser. Three steps and you're in."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <article className="space-y-5" key={step.title}>
              <div className="relative flex h-64 items-center justify-center rounded-[2rem] bg-card p-8 ring-1 ring-border">
                {step.visual}
              </div>
              <div className="space-y-2 px-2">
                <h3 className="font-display font-semibold text-xl">
                  <span className="text-muted-foreground">0{index + 1}</span>{' '}
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
