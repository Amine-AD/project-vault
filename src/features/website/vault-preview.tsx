import { FileTextIcon, KeyRoundIcon, StarIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Sticker } from './components/sticker'

const ITEMS = [
  { title: 'GitHub', subtitle: 'dev@studio.io', type: 'login', fav: true },
  { title: 'AWS root', subtitle: 'ops@studio.io', type: 'login', fav: false },
  {
    title: 'Wi-Fi · Office',
    subtitle: 'Secure note',
    type: 'note',
    fav: false,
  },
] as const

/** Static, decorative mock of the vault used in the hero. */
export function VaultPreview() {
  return (
    <div aria-hidden className="relative mx-auto mt-16 max-w-5xl md:mt-20">
      <Sticker className="-top-5 -left-2 md:-left-6" color="lime" tilt={-5}>
        Zero-knowledge
      </Sticker>
      <Sticker
        className="-right-2 -bottom-5 md:-right-6"
        color="paper"
        tilt={4}
      >
        AES-256
      </Sticker>

      <div className="grid gap-4 rounded-[2rem] border bg-card p-4 shadow-2xl md:grid-cols-[1fr_1.15fr_1fr] md:p-6">
        {/* Column 1: list */}
        <div className="space-y-3">
          <ColumnHeader label="All items" count={24} />
          {ITEMS.map((item) => (
            <MiniItem key={item.title} {...item} />
          ))}
        </div>

        {/* Column 2: the "selected" item, in the brand color */}
        <div className="space-y-3">
          <ColumnHeader label="Selected" count={1} />
          <div className="rotate-[1.5deg] space-y-4 rounded-2xl bg-primary p-5 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-lg">GitHub</span>
              <StarIcon className="size-4" fill="currentColor" />
            </div>
            <MockField label="Username" value="dev@studio.io" />
            <MockField label="Password" value="••••••••••••••" />
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-white/70 text-xs">One-time code</span>
                <span className="font-mono text-white/70 text-xs">18s</span>
              </div>
              <div className="font-mono font-semibold text-2xl tracking-[0.2em]">
                481 207
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-3/5 rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: generator */}
        <div className="hidden space-y-3 md:block">
          <ColumnHeader label="Generator" count={20} />
          <div className="space-y-3 rounded-2xl border bg-background p-4">
            <div className="break-all font-mono text-sm">
              q7#Vt!mR2x@Lp9$kZ4wE
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span className="h-1 flex-1 rounded-full bg-success" key={i} />
              ))}
            </div>
            <span className="font-medium text-success-foreground text-xs">
              Very strong
            </span>
          </div>
          <div className="rounded-2xl border border-dashed p-4 text-center text-muted-foreground text-sm">
            + Add an item
          </div>
        </div>
      </div>
    </div>
  )
}

function ColumnHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1 font-semibold text-sm">
      <span>{label}</span>
      <span className="text-muted-foreground">{count}</span>
    </div>
  )
}

function MiniItem({
  title,
  subtitle,
  type,
  fav,
}: {
  title: string
  subtitle: string
  type: 'login' | 'note'
  fav: boolean
}) {
  const Icon = type === 'login' ? KeyRoundIcon : FileTextIcon
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg [&_svg]:size-4',
          type === 'login'
            ? 'bg-primary/10 text-primary-ink'
            : 'bg-success/10 text-success-foreground',
        )}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">{title}</div>
        <div className="truncate text-muted-foreground text-xs">{subtitle}</div>
      </div>
      {fav && <StarIcon className="size-4 text-warning" fill="currentColor" />}
    </div>
  )
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2">
      <div className="text-white/70 text-xs">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  )
}
