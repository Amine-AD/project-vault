import type React from 'react'
import { cn } from '#/lib/utils'

const COLORS = {
  lime: 'bg-brand-lime text-brand-ink',
  paper: 'bg-brand-paper text-brand-ink',
  ink: 'bg-brand-ink text-brand-lime',
  blue: 'bg-primary text-white',
} as const

interface StickerProps {
  children: React.ReactNode
  color?: keyof typeof COLORS
  /** Rotation in degrees. */
  tilt?: number
  /** "rect" is a tag, "round" a circular seal (size it with className). */
  shape?: 'rect' | 'round'
  className?: string
}

/**
 * OneVault "security tag": uppercase mono label with a crisp outline and a
 * hard offset shadow. The line color follows --sticker-line (ink on light
 * surfaces, paper on dark ones).
 */
export function Sticker({
  children,
  color = 'lime',
  tilt = -4,
  shape = 'rect',
  className,
}: StickerProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 select-none border-2 border-sticker-line font-mono font-semibold text-xs uppercase leading-4 tracking-[0.08em] shadow-[3px_3px_0_0_var(--sticker-line)] md:text-[13px]',
        shape === 'rect'
          ? 'inline-block whitespace-nowrap rounded-md px-3 py-2'
          : 'flex items-center justify-center rounded-full p-2 text-center',
        COLORS[color],
        className,
      )}
      style={{ rotate: `${tilt}deg` }}
    >
      {children}
    </span>
  )
}
