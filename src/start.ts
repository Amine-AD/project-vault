import { createMiddleware, createStart } from '@tanstack/react-start'

/**
 * Security headers for every response.
 *
 * A web vault runs whatever JavaScript the server sends, so the page must
 * not run anything else: the Content Security Policy only allows this
 * server's own scripts plus inline scripts carrying this response's random
 * nonce (TanStack's hydration data and the theme bootstrap). An injected
 * <script> or a script from another site is refused, and the page can only
 * talk to its own server, so a successful injection still can't send
 * secrets elsewhere.
 *
 * It's sent in production only: the Vite dev server injects scripts of its
 * own. See SECURITY.md for what this does and doesn't protect against.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' lets Argon2id's WebAssembly compile; it doesn't
    // allow eval() of JavaScript
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'`,
    // Style attributes are rendered inline; styles can't run code
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const nonce = IS_PRODUCTION
    ? Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64')
    : undefined
  // Read by getRouter() so TanStack puts the nonce on its inline scripts
  const result = await next({ context: { cspNonce: nonce } })

  const headers = result.response.headers
  try {
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Referrer-Policy', 'no-referrer')
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    )
    const https =
      new URL(request.url).protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https'
    if (https) {
      headers.set('Strict-Transport-Security', 'max-age=31536000')
    }
    if (nonce) {
      headers.set('Content-Security-Policy', contentSecurityPolicy(nonce))
    }
  } catch {
    // Some responses (e.g. redirects) have immutable headers
  }
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}))
