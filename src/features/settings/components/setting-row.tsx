import type React from 'react'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '#/components/ui/item'
import { cn } from '#/lib/utils'

interface SettingRowProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/** A titled setting with its control on the right. */
export function SettingRow({
  icon,
  title,
  description,
  children,
  className,
}: SettingRowProps) {
  return (
    <Item className={cn('rounded-none px-5 py-4', className)}>
      {icon && (
        <ItemMedia className="size-9 rounded-lg bg-primary/10 text-primary-ink dark:bg-primary/20">
          {icon}
        </ItemMedia>
      )}
      <ItemContent className="min-w-48">
        <ItemTitle>{title}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      {children && <ItemActions>{children}</ItemActions>}
    </Item>
  )
}

/** A section card: heading plus a bordered stack of rows. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="font-display font-semibold text-lg tracking-[-0.01em]">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-card divide-y shadow-xs/5',
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}
