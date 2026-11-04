import { type ErrorComponentProps, useLocation } from '@tanstack/react-router'
import { AppError, AppNotFound } from './app-status-page'
import { SiteError, SiteNotFound } from './site-status-page'

/**
 * Router-wide fallbacks. Pages under /app get the app style (they render in
 * the app shell's content pane, so the sidebar stays); everything else gets
 * the website style. The /app layout route sets its own error component, so
 * these only reach /app's child pages, which always have the shell around
 * them.
 */
function useInApp() {
  const pathname = useLocation({ select: (l) => l.pathname })
  return pathname === '/app' || pathname.startsWith('/app/')
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  return useInApp() ? (
    <AppError error={error} reset={reset} />
  ) : (
    <SiteError error={error} reset={reset} />
  )
}

export function RouteNotFound() {
  return useInApp() ? <AppNotFound /> : <SiteNotFound />
}
