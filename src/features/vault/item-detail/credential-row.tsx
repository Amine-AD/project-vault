import { CheckIcon, CopyIcon } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { useVault } from '#/context/VaultContext'
import { cn } from '#/lib/utils'

interface CredentialRowProps {
  label: React.ReactNode
  children: React.ReactNode
  /** Clicking anywhere on the row copies this (through the vault, so the
   * clipboard auto-clear setting applies). */
  copyValue?: string
  /** Accessible name for the copy action, e.g. "Copy password". */
  copyLabel?: string
  /** Extra controls (reveal, open link). They don't trigger the copy. */
  actions?: React.ReactNode
  /** Extra content under the value (e.g. a countdown bar). */
  footer?: React.ReactNode
  mono?: boolean
  className?: string
}

/**
 * One labelled field (username, password, URL…). The whole row is the copy
 * target: a full-size button sits under the content, and a hint appears on
 * hover. Extra actions stay clickable on top of it.
 */
export function CredentialRow({
  label,
  children,
  copyValue,
  copyLabel,
  actions,
  footer,
  mono = false,
  className,
}: CredentialRowProps) {
  const { copySecureText } = useVault()
  const [copied, setCopied] = useState(false)
  const canCopy = !!copyValue

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <div
      className={cn(
        'group/row relative flex items-center gap-3 px-5 py-3.5',
        canCopy && 'transition-colors hover:bg-muted/50',
        className,
      )}
    >
      {canCopy && (
        <button
          aria-label={copyLabel ?? 'Copy'}
          className="absolute inset-0 cursor-copy outline-none focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/32 focus-visible:ring-inset"
          onClick={async () => {
            await copySecureText(copyValue)
            setCopied(true)
          }}
          type="button"
        />
      )}

      <div className="pointer-events-none relative min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          {label}
        </div>
        <div
          className={cn(
            'truncate text-[0.9375rem] text-foreground',
            mono && 'font-mono tracking-tight',
          )}
        >
          {children}
        </div>
        {footer}
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        {actions}
        {canCopy && (
          <span
            aria-live="polite"
            className={cn(
              'pointer-events-none flex h-8 w-[5.25rem] items-center justify-end gap-1.5 rounded-full px-2.5 font-medium text-xs transition-colors',
              copied
                ? 'bg-success/12 text-success-foreground'
                : 'text-muted-foreground/50 group-hover/row:text-foreground group-has-focus-visible/row:text-foreground',
            )}
          >
            {copied ? (
              <>
                <CheckIcon className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <span className="opacity-0 transition-opacity group-hover/row:opacity-100 group-has-focus-visible/row:opacity-100">
                  Copy
                </span>
                <CopyIcon className="size-3.5" />
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/** Bordered card that stacks credential rows with dividers. */
export function CredentialGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y overflow-hidden rounded-2xl border bg-card shadow-xs/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
      {children}
    </h3>
  )
}
