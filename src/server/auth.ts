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
import {
  emailVerifications,
  lockedVaults,
  sessions,
  trustedDevices,
  users,
  vaultItems,
} from '../db/schema'
import {
  EmailDeliveryError,
  sendAccountDeleted,
  sendAccountExists,
  sendRecoveryCode,
  sendSecurityAlert,
  sendSignupCode,
} from './email'
import {
  consumeTicket,
  findTicket,
  issueCode,
  TICKET_EXPIRED,
  VerificationError,
  type VerificationPurpose,
  verifyCode,
} from './email-verification'
import {
  requireSessionUser,
  SESSION_COOKIE_NAME,
  sessionUser,
  verifySecret,
} from './guards'
import { NEUTRAL_METADATA, toClientRow } from './item-rows'
import { recordSuccess } from './rate-limit'
import {
  checkDeviceProof,
  type DeviceInput,
  type DeviceProofInput,
  deleteDevices,
  deviceId,
  lockAwayVault,
  saveDevice,
} from './recovery-store'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const INVALID_CREDENTIALS = 'Invalid email or master password.'
const INVALID_RECOVERY = "That recovery key doesn't match this email."
const UNTRUSTED_DEVICE =
  'This browser isn’t a trusted device for this vault anymore. Use your recovery key instead.'

/** Client-made recovery kit material (see src/lib/recovery.ts). */
interface RecoveryInput {
  authKey: string
  wrappedKey: string
}

/** How a forgotten-password recovery proves it can open the vault. */
type RecoveryProof =
  | { kind: 'recoveryKey'; authKey: string }
  | ({ kind: 'device' } & DeviceProofInput)

interface ReEncryptedItem {
  id: string
  encryptedData: string
}

function normalizeEmail(email: string) {
  return String(email ?? '')
    .toLowerCase()
    .trim()
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

    // Same shape either way, so this can't be used to find registered emails
    if (user) {
      return { salt: user.salt, kdfIterations: user.kdfIterations }
    }

    return { salt: generateFakeSalt(email), kdfIterations: 600000 }
  })

/**
 * Emails a 6-digit code for sign-up or recovery. Always answers the same way
 * whether or not the email has a vault: signing up with a registered email
 * sends an "you already have a vault" email instead of a code, and
 * recovering an unknown email sends nothing.
 */
export const requestEmailCode = createServerFn({ method: 'POST' })
  .validator((data: { email: string; purpose: VerificationPurpose }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }
    if (data.purpose !== 'signup' && data.purpose !== 'recovery') {
      return { success: false, error: 'Invalid request.' }
    }

    let code: string
    try {
      code = issueCode(email, data.purpose)
    } catch (err) {
      if (err instanceof VerificationError) {
        return { success: false, error: err.message }
      }
      throw err
    }

    const user = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (data.purpose === 'recovery') {
      // Not awaited: waiting only when an email goes out would reveal, by
      // response time, whether the address has a vault.
      if (user) {
        sendRecoveryCode(email, code).catch((err) =>
          console.error('[email] Recovery code not delivered', err),
        )
      }
      return { success: true }
    }

    // Sign-up sends an email in both cases, so delivery errors can be shown
    try {
      if (user) await sendAccountExists(email)
      else await sendSignupCode(email, code)
    } catch (err) {
      if (err instanceof EmailDeliveryError) {
        return { success: false, error: err.message }
      }
      throw err
    }
    return { success: true }
  })

/** Checks an emailed code and returns a ticket for the next step. */
export const verifyEmailCode = createServerFn({ method: 'POST' })
  .validator(
    (data: { email: string; purpose: VerificationPurpose; code: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    if (data.purpose !== 'signup' && data.purpose !== 'recovery') {
      return { success: false as const, error: 'Invalid request.' }
    }
    try {
      const ticket = verifyCode(email, data.purpose, String(data.code ?? ''))
      return { success: true as const, ticket }
    } catch (err) {
      if (err instanceof VerificationError) {
        return { success: false as const, error: err.message }
      }
      throw err
    }
  })

/**
 * Register user with salt, client-derived authKey and a recovery kit. Needs
 * the ticket from a verified sign-up code.
 */
export const registerUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      salt: string
      authKey: string
      kdfIterations?: number
      recovery?: RecoveryInput
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)

    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    const verification = findTicket(email, 'signup', String(data.ticket ?? ''))
    if (!verification) {
      return { success: false, error: TICKET_EXPIRED }
    }

    // Safe to say now: the caller has proven they own this email
    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists.',
      }
    }

    const userId = crypto.randomUUID()
    const now = Date.now()

    db.transaction((tx) => {
      tx.insert(users)
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
      saveDevice(tx, userId, data.device)
      consumeTicket(verification.id, tx)
    })

    startSession(userId)

    return { success: true, user: { id: userId, email } }
  })

/**
 * Login user by comparing client-derived authKey. Also used to unlock an
 * already signed-in vault. Either way the browser can send its device
 * enrollment, which trusts it for recovery (or refreshes its wrapped key).
 */
export const loginUser = createServerFn({ method: 'POST' })
  .validator(
    (data: { email: string; authKey: string; device?: DeviceInput }) => data,
  )
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

    saveDevice(db, user.id, data.device)
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
 * cleared if none is sent). Other trusted devices hold the old key too, so
 * they're dropped and trusted again the next time they unlock; this browser
 * stays trusted with the new key.
 */
export const changeMasterPassword = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      oldAuthKey: string
      newSalt: string
      newAuthKey: string
      reEncryptedItems: ReEncryptedItem[]
      newRecovery?: RecoveryInput
      device?: DeviceInput
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
      deleteDevices(tx, user.id, deviceId(data.device))
      saveDevice(tx, user.id, data.device)
    })

    void sendSecurityAlert(user.email, 'changed')

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

function findUser(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get()
}

/**
 * Checks a recovery proof (recovery key or trusted device) and returns the
 * vault key wrapped for it.
 */
function checkRecoveryProof(
  email: string,
  user: ReturnType<typeof findUser>,
  proof: RecoveryProof,
): { ok: true; wrappedKey: string } | { ok: false; error: string } {
  if (proof?.kind === 'device') {
    const check = checkDeviceProof(email, user, proof)
    return check.ok
      ? check
      : { ok: false, error: check.error ?? UNTRUSTED_DEVICE }
  }
  if (proof?.kind !== 'recoveryKey') {
    return { ok: false, error: 'Invalid request.' }
  }
  const check = verifySecret(
    `recover:${email}`,
    proof.authKey,
    user?.recoveryAuthHash,
  )
  if (!check.ok || !user?.recoveryWrappedKey) {
    return { ok: false, error: (!check.ok && check.error) || INVALID_RECOVERY }
  }
  return { ok: true, wrappedKey: user.recoveryWrappedKey }
}

/**
 * Recovery step 1: with a verified recovery email ticket, prove possession
 * of the recovery key or a trusted device, and receive the wrapped vault key
 * plus the encrypted items, so the browser can decrypt them and re-encrypt
 * under a new master password. Both are needed: a found recovery kit or a
 * stolen laptop alone isn't enough.
 */
export const startRecovery = createServerFn({ method: 'POST' })
  .validator(
    (data: { email: string; ticket: string; proof: RecoveryProof }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    if (!findTicket(email, 'recovery', String(data.ticket ?? ''))) {
      return { success: false as const, error: TICKET_EXPIRED }
    }
    const user = findUser(email)

    const check = checkRecoveryProof(email, user, data.proof)
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: check.ok ? INVALID_RECOVERY : check.error,
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
      wrappedKey: check.wrappedKey,
      kdfIterations: user.kdfIterations,
      items,
    }
  })

/**
 * Recovery step 2: set the new master password, store the re-encrypted
 * items and a fresh recovery kit, sign out every other session, drop other
 * trusted devices (their wrapped keys are stale) and sign in.
 */
export const completeRecovery = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      proof: RecoveryProof
      newSalt: string
      newAuthKey: string
      reEncryptedItems: ReEncryptedItem[]
      newRecovery: RecoveryInput
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const verification = findTicket(
      email,
      'recovery',
      String(data.ticket ?? ''),
    )
    if (!verification) {
      return { success: false as const, error: TICKET_EXPIRED }
    }
    const user = findUser(email)

    const check = checkRecoveryProof(email, user, data.proof)
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: check.ok ? INVALID_RECOVERY : check.error,
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
      deleteDevices(tx, user.id, deviceId(data.device))
      saveDevice(tx, user.id, data.device)
      consumeTicket(verification.id, tx)
    })

    recordSuccess(user.email)
    startSession(user.id)
    void sendSecurityAlert(
      user.email,
      data.proof.kind === 'device' ? 'recoveredOnDevice' : 'recovered',
    )

    return { success: true as const, user: { id: user.id, email: user.email } }
  })

/**
 * No recovery key and no trusted device: after confirming the email, start
 * a new, empty vault under a new master password and recovery kit. Nothing
 * is deleted: the old items are locked away, still encrypted with the old
 * password, and can be restored from Settings with the old password, the
 * old recovery key or a device trusted before the reset.
 */
export const resetAccount = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      salt: string
      authKey: string
      kdfIterations?: number
      recovery: RecoveryInput
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const verification = findTicket(
      email,
      'recovery',
      String(data.ticket ?? ''),
    )
    const user = verification ? findUser(email) : undefined
    if (!verification || !user) {
      return { success: false as const, error: TICKET_EXPIRED }
    }

    let lockedItemCount = 0
    db.transaction((tx) => {
      lockedItemCount = lockAwayVault(tx, user)
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
      tx.update(users)
        .set({
          salt: data.salt,
          authHash: bcrypt.hashSync(data.authKey, 10),
          kdfIterations: data.kdfIterations || 600000,
          ...recoveryColumns(data.recovery),
          updatedAt: Date.now(),
        })
        .where(eq(users.id, user.id))
        .run()
      saveDevice(tx, user.id, data.device)
      consumeTicket(verification.id, tx)
    })

    recordSuccess(user.email)
    recordSuccess(`recover:${user.email}`)
    startSession(user.id)
    void sendSecurityAlert(user.email, 'reset')

    return {
      success: true as const,
      user: { id: user.id, email: user.email },
      lockedItemCount,
    }
  })

/**
 * Permanently deletes the signed-in account and everything tied to it:
 * items, locked vaults, trusted devices, sessions and pending email codes.
 * Needs the master password (as its authKey), so an open session alone
 * isn't enough. Sends a confirmation email and clears the session cookie.
 */
export const deleteAccount = createServerFn({ method: 'POST' })
  .validator((data: { authKey: string }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()

    const check = verifySecret(user.email, data.authKey, user.authHash)
    if (!check.ok) {
      return {
        success: false as const,
        error: check.error ?? 'Master password is incorrect.',
      }
    }

    db.transaction((tx) => {
      // The foreign keys cascade too; deleting explicitly doesn't rely on it
      tx.delete(vaultItems).where(eq(vaultItems.userId, user.id)).run()
      tx.delete(lockedVaults).where(eq(lockedVaults.userId, user.id)).run()
      tx.delete(trustedDevices).where(eq(trustedDevices.userId, user.id)).run()
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
      tx.delete(emailVerifications)
        .where(eq(emailVerifications.email, user.email))
        .run()
      tx.delete(users).where(eq(users.id, user.id)).run()
    })

    deleteCookie(SESSION_COOKIE_NAME, { path: '/' })
    void sendAccountDeleted(user.email)

    return { success: true as const }
  })
