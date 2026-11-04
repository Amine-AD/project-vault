import { CheckIcon } from 'lucide-react'
import { SectionHeading } from './components/section-heading'
import { LEGAL } from './legal/legal-info'

const STEPS = [
  {
    comment: 'Clone the repository',
    command: `git clone ${LEGAL.sourceCodeUrl}.git onevault`,
  },
  { comment: 'Install dependencies', command: 'cd onevault && npm install' },
  { comment: 'Start your vault', command: 'npm run dev' },
]

const PERKS = [
  'A single SQLite file',
  'No cloud lock-in',
  'Runs on any Node.js host',
]

export function SelfHost() {
  return (
    <section
      className="scroll-mt-20 px-5 py-14 md:px-10 md:py-20"
      id="self-host"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="space-y-8">
          <SectionHeading
            title="Host it yourself in two minutes"
            description="Your vault, your machine. OneVault stores only ciphertext in a local SQLite database."
          />
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li className="flex items-center gap-3 text-lg" key={perk}>
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-brand-ink text-[#f2f0ea] shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center gap-2 border-white/10 border-b px-6 py-4">
            <span className="size-3 rounded-full bg-white/20" />
            <span className="size-3 rounded-full bg-white/20" />
            <span className="size-3 rounded-full bg-white/20" />
            <span className="ms-3 font-mono text-white/50 text-xs">
              terminal
            </span>
          </div>
          <div className="space-y-4 p-6 font-mono text-sm">
            {STEPS.map((step) => (
              <div className="space-y-1" key={step.command}>
                <p className="text-white/40"># {step.comment}</p>
                <p>
                  <span className="text-brand-lime">$</span> {step.command}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
