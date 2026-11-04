import { clientIp } from './request'

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

/**
 * Checks still running, per key. They count toward the limit, so firing many
 * guesses at once can't get more than the limit through before the first
 * failures are recorded (each check takes a while: the hash is slow on purpose).
 */
const inFlight = new Map<string, number>()

/**
 * Starts a secret check for `account` from this caller. Throws
 * TooManyAttemptsError if the account or caller is locked out, counting
 * checks still in progress. Call the returned function exactly once with
 * the result: a failure is recorded against the account and the caller, a
 * success clears the account's counter (not the caller's).
 */
export function beginAttempt(account: string): (succeeded: boolean) => void {
  const now = Date.now()
  const keys = keysFor(account)
  for (const { key, max } of keys) {
    const bucket = currentBucket(key, now)
    const used = (bucket?.failures ?? 0) + (inFlight.get(key) ?? 0)
    if (used >= max) {
      throw new TooManyAttemptsError(
        bucket ? bucket.windowStart + WINDOW_MS - now : 60_000,
      )
    }
  }
  for (const { key } of keys) inFlight.set(key, (inFlight.get(key) ?? 0) + 1)

  let finished = false
  return (succeeded) => {
    if (finished) return
    finished = true
    const at = Date.now()
    for (const { key } of keys) {
      const left = (inFlight.get(key) ?? 1) - 1
      if (left > 0) inFlight.set(key, left)
      else inFlight.delete(key)
    }
    if (succeeded) {
      buckets.delete(keys[0].key)
      return
    }
    for (const { key } of keys) {
      const bucket = currentBucket(key, at)
      if (bucket) bucket.failures += 1
      else buckets.set(key, { failures: 1, windowStart: at })
    }
  }
}

/** A successful sign-in clears the account's counter (not the IP's). */
export function recordSuccess(account: string) {
  buckets.delete(keysFor(account)[0].key)
}

/**
 * Fixed-window quota for actions that cost something even when they succeed
 * (like sending an email). Returns false once `key` has used up `max` in the
 * current window, without counting the refused call.
 */
const quotas = new Map<string, Bucket & { windowMs: number }>()

export function takeQuota(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const quota = quotas.get(key)
  if (!quota || now - quota.windowStart >= quota.windowMs) {
    quotas.set(key, { failures: 1, windowStart: now, windowMs })
    return true
  }
  if (quota.failures >= max) return false
  quota.failures += 1
  return true
}

// Drop expired buckets now and then so the maps can't grow without bound.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) buckets.delete(key)
  }
  for (const [key, quota] of quotas) {
    if (now - quota.windowStart >= quota.windowMs) quotas.delete(key)
  }
}, WINDOW_MS).unref?.()
