import { getCookie } from '@tanstack/react-start/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { sessions, type User, users } from '../db/schema'
import {
  assertNotLimited,
  recordFailure,
  recordSuccess,
  TooManyAttemptsError,
} from './rate-limit'

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
  if (!session || session.expiresAt < Date.now()) return null
  return (
    db.select().from(users).where(eq(users.id, session.userId)).get() ?? null
  )
}

export function requireSessionUser(): User {
  const user = sessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/** The lockout message if the account or caller is locked out, else null. */
export function lockoutError(account: string): string | null {
  try {
    assertNotLimited(account)
    return null
  } catch (err) {
    if (err instanceof TooManyAttemptsError) return err.message
    throw err
  }
}

/**
 * Compared against when there is no real hash (unknown email, no recovery
 * kit), so a miss takes as long as a wrong guess and response times don't
 * reveal which accounts exist.
 */
let dummyHash: string | null = null
function standInHash() {
  dummyHash ??= bcrypt.hashSync('onevault-no-such-secret', 10)
  return dummyHash
}

/**
 * Checks a secret against its bcrypt hash with lockout accounting. Each kind
 * of secret uses its own `account` key (e.g. "recover:<email>"), so failures
 * of one don't lock out another.
 */
export function verifySecret(
  account: string,
  secret: string,
  hash: string | null | undefined,
): { ok: true } | { ok: false; error: string | null } {
  const locked = lockoutError(account)
  if (locked) return { ok: false, error: locked }
  const matches = bcrypt.compareSync(
    String(secret ?? ''),
    hash || standInHash(),
  )
  if (!hash || !matches) {
    recordFailure(account)
    return { ok: false, error: null }
  }
  recordSuccess(account)
  return { ok: true }
}
