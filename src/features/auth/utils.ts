/**
 * Returns the first TanStack Form field error (Standard Schema issue or string)
 * as display text, so a field never shows a stack of messages.
 */
export function getFieldErrorText(errors: ReadonlyArray<unknown>): string {
  for (const error of errors) {
    if (typeof error === 'string' && error) return error
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
  }
  return ''
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
