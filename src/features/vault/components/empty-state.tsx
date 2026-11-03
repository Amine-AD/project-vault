import type React from 'react'
import { cn } from '#/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Shark UI has no empty-state component, so this is a small custom one. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-5">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && (
          <p className="max-w-xs text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
