import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { getGlobalStartContext } from '@tanstack/react-start'
import { RouteError, RouteNotFound } from './features/errors/route-status'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  // On the server: this response's CSP nonce (see src/start.ts), put on
  // every inline script TanStack renders. Undefined in the browser.
  const context = getGlobalStartContext() as { cspNonce?: string } | undefined
  const nonce = context?.cspNonce

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
    ssr: nonce ? { nonce } : undefined,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
