import { cn } from '#/lib/utils'

/**
 * The error message and stack, in development only. Production users never
 * see internals.
 */
export function ErrorDetails({
  error,
  className,
}: {
  error: unknown
  className?: string
}) {
  if (!import.meta.env.DEV) return null

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  return (
    <details
      className={cn(
        'w-full max-w-xl rounded-xl border bg-muted/50 p-3 text-start text-sm',
        className,
      )}
    >
      <summary className="cursor-pointer font-medium text-muted-foreground">
        Error details (development only)
      </summary>
      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-muted-foreground text-xs">
        {stack ?? message}
      </pre>
    </details>
  )
}
