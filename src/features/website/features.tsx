import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { SectionHeading } from './components/section-heading'
import { Sticker } from './components/sticker'

const CAPABILITIES = [
  'Logins',
  'Secure notes',
  '2FA codes',
  'Password generator',
  'Custom fields',
  'Tags',
  'Favorites',
  'CSV import',
  'JSON export',
  'Auto-lock',
  'Clipboard clearing',
  'Dark mode',
]

type Cell = string | boolean

const COMPARISON: {
  name: string
  highlight?: boolean
  rows: [string, Cell][]
}[] = [
  {
    name: 'OneVault',
    highlight: true,
    rows: [
      ['Encrypted', 'AES-256, in your browser'],
      ['Who can read it', 'Only you'],
      ['Built-in 2FA codes', true],
      ['Where it lives', 'Your own server'],
    ],
  },
  {
    name: 'Browser saving',
    rows: [
      ['Encrypted', 'Depends on the browser'],
      ['Who can read it', 'Anyone on your device account'],
      ['Built-in 2FA codes', false],
      ['Where it lives', 'Your browser account'],
    ],
  },
  {
    name: 'Spreadsheet',
    rows: [
      ['Encrypted', 'No'],
      ['Who can read it', 'Anyone with the file'],
      ['Built-in 2FA codes', false],
      ['Where it lives', 'Wherever it was copied'],
    ],
  },
]

export function Features() {
  return (
    <section
      className="scroll-mt-20 px-5 py-14 md:px-10 md:py-20"
      id="features"
    >
      <div className="mx-auto max-w-7xl space-y-20">
        <div className="space-y-10">
          <SectionHeading
            title="Everything you need, nothing you don't"
            description="The essentials of a password manager, done carefully."
          />
          <ul className="flex flex-wrap gap-3">
            {CAPABILITIES.map((label, i) => (
              <li
                className={cn(
                  'rounded-full border bg-card px-5 py-2.5 font-medium text-base shadow-xs/5 md:text-lg',
                  i % 5 === 2 && 'border-transparent bg-primary text-white',
                )}
                key={label}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-10">
          <SectionHeading
            title="Safer than your browser, simpler than a spreadsheet"
            description="Where your passwords end up, three ways."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {COMPARISON.map((col) => (
              <div
                className={cn(
                  'relative space-y-6 rounded-[2rem] p-7',
                  col.highlight
                    ? 'bg-primary text-white shadow-xl'
                    : 'bg-card ring-1 ring-border',
                )}
                key={col.name}
              >
                {col.highlight && (
                  <Sticker className="-top-4 right-6" color="lime" tilt={4}>
                    You're here
                  </Sticker>
                )}
                <h3 className="font-display font-semibold text-2xl">
                  {col.name}
                </h3>
                <dl className="divide-y divide-current/15">
                  {col.rows.map(([label, value]) => (
                    <div className="space-y-1 py-3" key={label}>
                      <dt
                        className={cn(
                          'text-sm',
                          col.highlight
                            ? 'text-white/70'
                            : 'text-muted-foreground',
                        )}
                      >
                        {label}
                      </dt>
                      <dd className="font-semibold">
                        <CellValue value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CheckIcon className="size-4" /> Yes
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 opacity-70">
        <MinusIcon className="size-4" /> No
      </span>
    )
  }
  return <>{value}</>
}
