import { MoonIcon, SunIcon } from 'lucide-react'
import { type Theme, useTheme } from '#/lib/theme'
import { cn } from '#/lib/utils'
import { SegmentGroup, SegmentGroupItem } from './ui/segment-group'

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
]

const TONES = {
  /** On the page background: ink knob. */
  default: {
    pill: 'border-foreground/20 [&_[data-slot=segment-group-indicator]]:bg-foreground',
    item: 'text-foreground/70 hover:text-foreground data-[state=checked]:text-background',
  },
  /** On a solid primary surface (the mobile menu): white knob. */
  inverse: {
    pill: 'border-white/35 [&_[data-slot=segment-group-indicator]]:bg-white',
    item: 'text-white/80 hover:text-white data-[state=checked]:text-primary',
  },
} as const

/**
 * Ondeck-style appearance switch: a bordered pill with sun and moon, where
 * a solid knob slides under the active one.
 */
export function ThemeToggle({
  className,
  tone = 'default',
}: {
  className?: string
  tone?: keyof typeof TONES
}) {
  const { theme, setTheme } = useTheme()
  const pillClass = cn(
    'h-10 w-fit shrink-0 gap-0 rounded-full border p-[3px]',
    TONES[tone].pill,
  )

  // The theme is only known after mount; render a same-size placeholder until
  // then so the knob is measured against the right option on first paint.
  if (!theme) {
    return (
      <div aria-hidden className={cn(pillClass, 'flex', className)}>
        {OPTIONS.map(({ value, icon: Icon }) => (
          <span
            className={cn(
              'flex size-8 items-center justify-center',
              TONES[tone].item,
            )}
            key={value}
          >
            <Icon className="size-4" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <SegmentGroup
      aria-label="Appearance"
      className={cn(pillClass, className)}
      onValueChange={({ value }) => value && setTheme(value as Theme)}
      value={theme}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <SegmentGroupItem
          aria-label={label}
          className={cn(
            'flex size-8 items-center justify-center rounded-full transition-colors duration-150',
            TONES[tone].item,
          )}
          key={value}
          title={label}
          value={value}
        >
          <Icon aria-hidden className="relative z-1 size-4" />
        </SegmentGroupItem>
      ))}
    </SegmentGroup>
  )
}
