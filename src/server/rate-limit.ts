import { getRequestIP } from '@tanstack/react-start/server'

/**
 * In-memory limiter for failed master-password attempts.
 *
 * Failures are counted per account and per IP address inside a sliding
 * window; once a key reaches its limit it is locked until the window that
 * started with its first failure ends. Kept in process memory, which suits a
 * single self-hosted server; counters reset when the server restarts.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_ACCOUNT = 5
const MAX_FAILURES_PER_IP = 20

interface Bucket {
  failures: number
  windowStart: number
}

const buckets = new Map<string, Bucket>()

function currentBucket(key: string, now: number): Bucket | undefined {
  const bucket = buckets.get(key)
  if (bucket && now - bucket.windowStart >= WINDOW_MS) {
    buckets.delete(key)
    return undefined
  }
  return bucket
}

function clientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function keysFor(account: string) {
  return [
    {
      key: `acct:${account.toLowerCase().trim()}`,
      max: MAX_FAILURES_PER_ACCOUNT,
    },
    { key: `ip:${clientIp()}`, max: MAX_FAILURES_PER_IP },
  ]
}

/** Thrown when an account or IP has too many recent failures. */
export class TooManyAttemptsError extends Error {
  constructor(public retryAfterMs: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    super(
      `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    )
  }
}

/** Throws TooManyAttemptsError if the account or caller is locked out. */
export function assertNotLimited(account: string) {
  const now = Date.now()
  for (const { key, max } of keysFor(account)) {
    const bucket = currentBucket(key, now)
    if (bucket && bucket.failures >= max) {
      throw new TooManyAttemptsError(bucket.windowStart + WINDOW_MS - now)
    }
  }
}

export function recordFailure(account: string) {
  const now = Date.now()
  for (const { key } of keysFor(account)) {
    const bucket = currentBucket(key, now)
    if (bucket) bucket.failures += 1
    else buckets.set(key, { failures: 1, windowStart: now })
  }
}

/** A successful sign-in clears the account's counter (not the IP's). */
export function recordSuccess(account: string) {
  buckets.delete(keysFor(account)[0].key)
}

// Drop expired buckets now and then so the map can't grow without bound.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key)
  }
}, WINDOW_MS).unref?.()
