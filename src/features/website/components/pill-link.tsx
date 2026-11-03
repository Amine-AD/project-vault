import type React from 'react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * White pill button that fills lime on hover. Pass a link as the child.
 */
export function WhitePillButton({
  children,
  className,
}: {
  children: React.ReactElement
  className?: string
}) {
  return (
    <Button
      asChild
      className={cn(
        'h-auto rounded-full border-0 bg-white px-[30px] py-[18px] font-semibold text-brand-ink text-base leading-[22px] shadow-none transition-colors hover:bg-brand-lime',
        className,
      )}
    >
      {children}
    </Button>
  )
}
