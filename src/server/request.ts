import './env'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'

/**
 * Who is calling, and over what. Proxy headers (X-Forwarded-For,
 * X-Forwarded-Proto) are only believed when TRUST_PROXY says a reverse proxy
 * sits in front of the app: without one, any client can send those headers
 * and pose as a new IP address on every request, which would make the per-IP
 * rate limits useless.
 *
 * TRUST_PROXY (in .env):
 *  - unset, "false" or "0": no proxy; use the connection's address.
 *  - "true" or "1": one proxy (Caddy, nginx, Traefik…) in front.
 *  - a number N: N proxies in a chain (e.g. Cloudflare, then nginx = 2).
 */

function trustedProxyHops(): number {
  const value = process.env.TRUST_PROXY?.trim().toLowerCase()
  if (!value || value === 'false') return 0
  if (value === 'true') return 1
  const hops = Number.parseInt(value, 10)
  return Number.isFinite(hops) && hops > 0 ? hops : 0
}

let warnedAboutProxy = false

/**
 * The client's IP address. Behind N trusted proxies it's the Nth entry from
 * the right of X-Forwarded-For: each proxy appends the address it saw, so the
 * entries to the left of that were written by the client and can be faked.
 */
export function clientIp(): string {
  try {
    const hops = trustedProxyHops()
    const forwarded = getRequest().headers.get('x-forwarded-for')
    if (hops > 0 && forwarded) {
      const chain = forwarded
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      const ip = chain[Math.max(0, chain.length - hops)]
      if (ip) return ip
    }
    if (hops === 0 && forwarded && !warnedAboutProxy) {
      warnedAboutProxy = true
      console.warn(
        '[request] X-Forwarded-For received but TRUST_PROXY is not set, so it is ignored. ' +
          'If OneVault runs behind a reverse proxy, set TRUST_PROXY=1 in .env; ' +
          'otherwise every visitor shares the proxy’s rate limits.',
      )
    }
    return getRequestIP() ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** True if the browser reached the app over HTTPS. */
export function isHttps(): boolean {
  try {
    const request = getRequest()
    if (new URL(request.url).protocol === 'https:') return true
    if (trustedProxyHops() === 0) return false
    const proto = request.headers
      .get('x-forwarded-proto')
      ?.split(',', 1)[0]
      ?.trim()
      .toLowerCase()
    return proto === 'https'
  } catch {
    return false
  }
}
