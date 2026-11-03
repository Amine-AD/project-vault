import { cn } from '#/lib/utils'

/**
 * Keyhole drawn inside a 100×100 disc centred at (50, 50).
 * Shared by every logo variant and the static SVGs in /public.
 */
export const KEYHOLE_PATH =
  'M50 26a14 14 0 0 0-7.2 26l-2.85 18.9A3.5 3.5 0 0 0 43.4 75h13.2a3.5 3.5 0 0 0 3.45-4.1L57.2 52A14 14 0 0 0 50 26Z'

interface LogoMarkProps {
  className?: string
  /** Disc color. Defaults to the theme primary. */
  disc?: string
  /** Keyhole color. */
  keyhole?: string
  title?: string
}

/** The OneVault mark: a solid disc with a keyhole. Doubles as the "O". */
export function LogoMark({
  className,
  disc = 'var(--primary)',
  keyhole = '#ffffff',
  title,
}: LogoMarkProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden) unless a title is passed
    <svg
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      viewBox="0 0 100 100"
    >
      {title && <title>{title}</title>}
      <circle cx="50" cy="50" fill={disc} r="50" />
      <path d={KEYHOLE_PATH} fill={keyhole} />
    </svg>
  )
}

interface LogoMarkStackedProps extends LogoMarkProps {
  /** Color of the offset disc behind the mark. */
  back?: string
}

/** Two stacked discs, like Ondeck's stacked cards. For big decorative use. */
export function LogoMarkStacked({
  className,
  disc = 'var(--primary)',
  keyhole = '#ffffff',
  back = '#d4f34a',
}: LogoMarkStackedProps) {
  return (
    <svg
      aria-hidden
      className={cn('shrink-0', className)}
      viewBox="0 0 110 108"
    >
      <circle cx="60" cy="58" fill={back} r="50" />
      <circle cx="50" cy="50" fill={disc} r="50" />
      <path d={KEYHOLE_PATH} fill={keyhole} />
    </svg>
  )
}

interface BrandLogoProps {
  className?: string
  /** Only the mark, no wordmark. */
  markOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const TEXT_SIZE = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-3xl',
} as const

const MARK_SIZE = { sm: 'size-7', md: 'size-8', lg: 'size-11' } as const

/**
 * "OneVault" wordmark where the keyhole mark replaces the O.
 * The mark is sized a touch above the cap height and dips below the baseline,
 * like the overshoot of a real round capital O.
 */
export function BrandLogo({
  className,
  markOnly = false,
  size = 'md',
}: BrandLogoProps) {
  if (markOnly) {
    return (
      <LogoMark className={cn(MARK_SIZE[size], className)} title="OneVault" />
    )
  }

  return <BrandWordmark className={cn(TEXT_SIZE[size], className)} />
}

/**
 * The wordmark at any font size (set it with a text-* class). Pass mark colors
 * to recolor the "O" on colored surfaces.
 */
export function BrandWordmark({
  className,
  markDisc,
  markKeyhole,
}: {
  className?: string
  markDisc?: string
  markKeyhole?: string
}) {
  return (
    <span
      aria-label="OneVault"
      className={cn(
        'inline-flex items-baseline font-display font-semibold leading-none tracking-[-0.025em]',
        className,
      )}
      role="img"
    >
      <LogoMark
        className="me-[0.03em] size-[0.78em] translate-y-[0.025em] self-baseline"
        disc={markDisc}
        keyhole={markKeyhole}
      />
      <span aria-hidden>neVault</span>
    </span>
  )
}
