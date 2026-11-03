import { AlertCircleIcon } from 'lucide-react'

/**
 * Form-level error (e.g. wrong credentials returned by the server).
 */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive dark:text-destructive-foreground"
    >
      <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
      <p className="leading-snug">{message}</p>
    </div>
  )
}
