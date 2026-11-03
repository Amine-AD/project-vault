import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import bcrypt from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { sessions, type User, users, vaultItems } from '../db/schema'
import { NEUTRAL_METADATA, toClientRow } from './item-rows'
import {
  assertNotLimited,
  recordFailure,
  recordSuccess,
  TooManyAttemptsError,
} from './rate-limit'

const SESSION_COOKIE_NAME = 'vault_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const INVALID_CREDENTIALS = 'Invalid email or master password.'
const INVALID_RECOVERY = "That recovery key doesn't match this email."

/** Client-made recovery kit material (see src/lib/recovery.ts). */
interface RecoveryInput {
  authKey: string
  wrappedKey: string
}

interface ReEncryptedItem {
  id: string
  encryptedData: string
}

/** The lockout message if the account or caller is locked out, else null. */
function lockoutError(account: string): string | null {
  try {
    assertNotLimited(account)
    return null
  } catch (err) {
    if (err instanceof TooManyAttemptsError) return err.message
    throw err
  }
}

/**
 * Checks a secret against its bcrypt hash with lockout accounting. Recovery
 * attempts are counted separately from password attempts.
 */
function verifySecret(
  account: string,
  secret: string,
  hash: string | null | undefined,
): { ok: true } | { ok: false; error: string | null } {
  const locked = lockoutError(account)
  if (locked) return { ok: false, error: locked }
  if (!hash || !bcrypt.compareSync(secret, hash)) {
    recordFailure(account)
    return { ok: false, error: null }
  }
  recordSuccess(account)
  return { ok: true }
}

/** Columns for a new recovery kit, or for clearing it (null). */
function recoveryColumns(recovery: RecoveryInput | null | undefined) {
  return recovery
    ? {
        recoveryAuthHash: bcrypt.hashSync(recovery.authKey, 10),
        recoveryWrappedKey: recovery.wrappedKey,
        recoveryCreatedAt: Date.now(),
      }
    : {
        recoveryAuthHash: null,
        recoveryWrappedKey: null,
        recoveryCreatedAt: null,
      }
}

/** Creates a session row and sets the HttpOnly cookie. */
function startSession(userId: string) {
  const now = Date.now()
  const token = crypto.randomBytes(32).toString('hex')
  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt: now + SESSION_DURATION_MS,
      createdAt: now,
    })
    .run()
  setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  })
}

/** The signed-in user (full row), or null. */
function sessionUser(): User | null {
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

function requireSessionUser(): User {
  const user = sessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/** Replaces every item's ciphertext and neutralizes its plaintext metadata. */
function writeReEncryptedItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  items: ReEncryptedItem[],
) {
  for (const item of items) {
    tx.update(vaultItems)
      .set({ ...NEUTRAL_METADATA, encryptedData: item.encryptedData })
      .where(and(eq(vaultItems.id, item.id), eq(vaultItems.userId, userId)))
      .run()
  }
}

// Deterministic salt generator for non-existing emails to prevent timing/enumeration attacks
function generateFakeSalt(email: string): string {
  const hmac = crypto.createHmac('sha256', 'vault-fake-salt-secret-key-salt')
  hmac.update(email.toLowerCase().trim())
  return hmac.digest('base64').slice(0, 24)
}

/**
 * Pre-login endpoint to fetch the user's KDF salt
 */
export const getPreloginData = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()
    const user = db.select().from(users).where(eq(users.email, email)).get()

    if (user) {
      return {
        salt: user.salt,
        kdfIterations: user.kdfIterations,
        exists: true,
      }
    }

    return {
      salt: generateFakeSalt(email),
      kdfIterations: 600000,
      exists: false,
    }
  })

/**
 * Register user with salt, client-derived authKey and a recovery kit
 */
export const registerUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      salt: string
      authKey: string
      kdfIterations?: number
      recovery?: RecoveryInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()

    if (!email?.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists.',
      }
    }

    const userId = crypto.randomUUID()
    const now = Date.now()

    db.insert(users)
      .values({
        id: userId,
        email,
        salt: data.salt,
        // Hash the client-derived authKey on server before storage
        authHash: bcrypt.hashSync(data.authKey, 10),
        kdfIterations: data.kdfIterations || 600000,
        ...recoveryColumns(data.recovery),
        createdAt: now,
        updatedAt: now,
      })
      .run()

    startSession(userId)

    return { success: true, user: { id: userId, email } }
  })

/**
 * Login user by comparing client-derived authKey
 */
export const loginUser = createServerFn({ method: 'POST' })
  .validator((data: { email: string; authKey: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()
    const user = db.select().from(users).where(eq(users.email, email)).get()

    const check = verifySecret(email, data.authKey, user?.authHash)
    if (!check.ok || !user) {
      return {
        success: false,
        error: (!check.ok && check.error) || INVALID_CREDENTIALS,
      }
    }

    startSession(user.id)

    return { success: true, user: { id: user.id, email: user.email } }
  })

/**
 * Logout and clear session
 */
export const logoutUser = createServerFn({ method: 'POST' }).handler(
  async () => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (token) {
      db.delete(sessions).where(eq(sessions.token, token)).run()
    }

    deleteCookie(SESSION_COOKIE_NAME, { path: '/' })
    return { success: true }
  },
)

/**
 * Get current session user
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = sessionUser()
    if (!user) {
      deleteCookie(SESSION_COOKIE_NAME, { path: '/' })
      return { user: null }
    }
    return { user: { id: user.id, email: user.email } }
  },
)

/**
 * Change master password, re-encrypting every item. The old recovery kit
 * wraps the old vault key, so it's replaced by the new one sent along (or
 * cleared if none is sent).
 */
export const changeMasterPassword = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      oldAuthKey: string
      newSalt: string
      newAuthKey: string
      reEncryptedItems: ReEncryptedItem[]
      newRecovery?: RecoveryInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireSessionUser()

    const check = verifySecret(user.email, data.oldAuthKey, user.authHash)
    if (!check.ok) {
      return {
        success: false,
        error: check.error ?? 'Current master password is incorrect.',
      }
    }

    db.transaction((tx) => {
      tx.update(users)
        .set({
          salt: data.newSalt,
          authHash: bcrypt.hashSync(data.newAuthKey, 10),
          ...recoveryColumns(data.newRecovery),
          updatedAt: Date.now(),
        })
        .where(eq(users.id, user.id))
        .run()
      writeReEncryptedItems(tx, user.id, data.reEncryptedItems)
    })

    return { success: true }
  })

/**
 * When the signed-in user's recovery kit was created (null if never).
 */
export const getRecoveryStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireSessionUser()
    return { createdAt: user.recoveryCreatedAt ?? null }
  },
)

/**
 * Create or replace the recovery kit. Needs the master password (as its
 * authKey), since a new kit replaces the old one.
 */
export const setRecoveryKit = createServerFn({ method: 'POST' })
  .validator((data: { authKey: string; recovery: RecoveryInput }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()

    const check = verifySecret(user.email, data.authKey, user.authHash)
    if (!check.ok) {
      return {
        success: false,
        error: check.error ?? 'Master password is incorrect.',
      }
    }

    const columns = recoveryColumns(data.recovery)
    db.update(users).set(columns).where(eq(users.id, user.id)).run()

    return { success: true, createdAt: columns.recoveryCreatedAt }
  })

/**
 * Recovery step 1: prove possession of the recovery key and receive the
 * wrapped vault key plus the encrypted items, so the browser can decrypt
 * them and re-encrypt under a new master password.
 */
export const startRecovery = createServerFn({ method: 'POST' })
  .validator((data: { email: string; recoveryAuthKey: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()
    const user = db.select().from(users).where(eq(users.email, email)).get()

    const check = verifySecret(
      `recover:${email}`,
      data.recoveryAuthKey,
      user?.recoveryAuthHash,
    )
    if (!check.ok || !user?.recoveryWrappedKey) {
      return {
        success: false as const,
        error: (!check.ok && check.error) || INVALID_RECOVERY,
      }
    }

    const items = db
      .select()
      .from(vaultItems)
      .where(eq(vaultItems.userId, user.id))
      .all()
      .map(toClientRow)

    return {
      success: true as const,
      wrappedKey: user.recoveryWrappedKey,
      kdfIterations: user.kdfIterations,
      items,
    }
  })

/**
 * Recovery step 2: set the new master password, store the re-encrypted
 * items and a fresh recovery kit, sign out every other session and sign in.
 */
export const completeRecovery = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      recoveryAuthKey: string
      newSalt: string
      newAuthKey: string
      reEncryptedItems: ReEncryptedItem[]
      newRecovery: RecoveryInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()
    const user = db.select().from(users).where(eq(users.email, email)).get()

    const check = verifySecret(
      `recover:${email}`,
      data.recoveryAuthKey,
      user?.recoveryAuthHash,
    )
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: (!check.ok && check.error) || INVALID_RECOVERY,
      }
    }

    db.transaction((tx) => {
      tx.update(users)
        .set({
          salt: data.newSalt,
          authHash: bcrypt.hashSync(data.newAuthKey, 10),
          ...recoveryColumns(data.newRecovery),
          updatedAt: Date.now(),
        })
        .where(eq(users.id, user.id))
        .run()
      writeReEncryptedItems(tx, user.id, data.reEncryptedItems)
      // Whoever was signed in with the forgotten password is signed out
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
    })

    recordSuccess(user.email)
    startSession(user.id)

    return { success: true as const, user: { id: user.id, email: user.email } }
  })
