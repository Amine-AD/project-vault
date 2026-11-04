import crypto from 'node:crypto'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { sessions, type User, users } from '../db/schema'
import { beginAttempt, TooManyAttemptsError } from './rate-limit'

/**
 * Server-only helpers shared by the server function modules: who is signed
 * in, and checking secrets with lockout accounting.
 */

export const SESSION_COOKIE_NAME = 'vault_session'

/** The signed-in user (full row), or null. */
export function sessionUser(): User | null {
  const token = getCookie(SESSION_COOKIE_NAME)
  if (!token) return null
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get()
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    db.delete(sessions).where(eq(sessions.id, session.id)).run()
    return null
  }
  return (
    db.select().from(users).where(eq(users.id, session.userId)).get() ?? null
  )
}

export function requireSessionUser(): User {
  const user = sessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/**
 * Stored secrets (auth keys, recovery auth keys, device proof tokens) are
 * hashed with scrypt. They're already high-entropy keys derived in the
 * browser; the slow, salted hash means a leaked database can't be used to
 * sign in, and adds cost to guessing the master password from it.
 *
 * scrypt runs on Node's worker thread pool, so a check doesn't stop the
 * server from answering other requests.
 * Format: scrypt$N$r$p$salt$hash (base64), so the cost can be raised later
 * without breaking existing hashes. N = 2^15 takes about 70 ms and 32 MiB.
 */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1 }
const SCRYPT_KEY_BYTES = 32

function scrypt(
  secret: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      secret,
      salt,
      SCRYPT_KEY_BYTES,
      { ...params, maxmem: 256 * params.N * params.r },
      (err, key) => (err ? reject(err) : resolve(key)),
    )
  })
}

/** Hashes a secret for storage. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(secret, salt, SCRYPT)
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$')
}

/** True if `secret` matches a hash made by hashSecret. */
async function matchesHash(secret: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split('$')
  const params = { N: Number(n), r: Number(r), p: Number(p) }
  if (
    scheme !== 'scrypt' ||
    !Number.isInteger(params.N) ||
    !Number.isInteger(params.r) ||
    !Number.isInteger(params.p) ||
    !salt ||
    !key
  ) {
    return false
  }
  const expected = Buffer.from(key, 'base64')
  const actual = await scrypt(secret, Buffer.from(salt, 'base64'), params)
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  )
}

/**
 * Compared against when there is no real hash (unknown email, no recovery
 * kit), so a miss takes as long as a wrong guess and response times don't
 * reveal which accounts exist.
 */
let dummyHash: Promise<string> | null = null
function standInHash() {
  dummyHash ??= hashSecret('onevault-no-such-secret')
  return dummyHash
}

/**
 * Checks a secret against its stored hash with lockout accounting. Each kind
 * of secret uses its own `account` key (e.g. "recover:<email>"), so failures
 * of one don't lock out another.
 */
export async function verifySecret(
  account: string,
  secret: string,
  hash: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string | null }> {
  let finish: (succeeded: boolean) => void
  try {
    finish = beginAttempt(account)
  } catch (err) {
    if (err instanceof TooManyAttemptsError) {
      return { ok: false, error: err.message }
    }
    throw err
  }
  let matches = false
  try {
    matches = await matchesHash(
      String(secret ?? ''),
      hash || (await standInHash()),
    )
  } finally {
    finish(!!hash && matches)
  }
  return hash && matches ? { ok: true } : { ok: false, error: null }
}
