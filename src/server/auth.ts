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
import { DEFAULT_KDF } from '../lib/kdf'
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
import { keyedHash } from './secrets'
import {
  INVALID_REQUEST,
  isAuthKey,
  isRecoveryInput,
  kdfColumns,
  kdfFromRow,
  type PasswordKeysInput,
  parseItemList,
  parsePasswordKeys,
  type RecoveryInput,
  type ReEncryptedItem,
} from './validation'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const INVALID_CREDENTIALS = 'Invalid email or master password.'
const INVALID_RECOVERY = "That recovery key doesn't match this email."
const UNTRUSTED_DEVICE =
  'This browser isn’t a trusted device for this vault anymore. Use your recovery key instead.'
const VAULT_CHANGED =
  'Your vault changed while this was in progress. Nothing was saved; try again.'

/** How a forgotten-password recovery proves it can open the vault. */
type RecoveryProof =
  | { kind: 'recoveryKey'; authKey: string }
  | ({ kind: 'device' } & DeviceProofInput)

/**
 * Salt, KDF settings and auth key for a master password, plus the vault key
 * wrapped with the master key derived from it. See src/lib/crypto.ts.
 */
type PasswordKeys = PasswordKeysInput

/**
 * A new vault key for a vault that had none (made before the random vault
 * key): every item re-encrypted with it, and a recovery kit that wraps it.
 */
interface KeyRotation {
  items: ReEncryptedItem[]
  recovery: RecoveryInput
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

/** Users columns for a new master password. */
function passwordColumns(keys: PasswordKeys) {
  return {
    salt: keys.salt,
    ...kdfColumns(keys.kdf),
    // The client-derived authKey is hashed again before storage
    authHash: bcrypt.hashSync(keys.authKey, 10),
    encryptedVaultKey: keys.encryptedVaultKey,
    updatedAt: Date.now(),
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

/**
 * Validates a key rotation: well-formed, with exactly one new ciphertext for
 * every item the user has (one left out would become unreadable).
 */
function parseRotation(
  userId: string,
  value: unknown,
): { ok: true; rotation: KeyRotation } | { ok: false; error: string } {
  const r = (value ?? {}) as Record<string, unknown>
  const items = parseItemList(r.items)
  if (!items || !isRecoveryInput(r.recovery)) {
    return { ok: false, error: INVALID_REQUEST }
  }
  const current = db
    .select({ id: vaultItems.id })
    .from(vaultItems)
    .where(eq(vaultItems.userId, userId))
    .all()
  const sent = new Set(items.map((i) => i.id))
  if (
    sent.size !== items.length ||
    sent.size !== current.length ||
    current.some((row) => !sent.has(row.id))
  ) {
    return { ok: false, error: VAULT_CHANGED }
  }
  return { ok: true, rotation: { items, recovery: r.recovery } }
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

/**
 * Stand-in salt for an email with no vault, so the pre-login answer looks
 * the same either way. Keyed with this server's secret: with a key in the
 * public source code, anyone could compute it and spot the stand-ins. Same
 * shape as a real salt (16 bytes, base64).
 */
function fakeSalt(email: string): string {
  return keyedHash('prelogin-salt', email).subarray(0, 16).toString('base64')
}

/**
 * Pre-login endpoint: the salt and KDF settings the browser needs to derive
 * keys from the master password.
 */
export const getPreloginData = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const user = db.select().from(users).where(eq(users.email, email)).get()

    // Same shape either way, so this can't be used to find registered emails
    if (user) {
      return { salt: user.salt, kdf: kdfFromRow(user) }
    }

    return { salt: fakeSalt(email), kdf: DEFAULT_KDF }
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
 * Register a user: KDF salt and settings, client-derived authKey, the vault
 * key wrapped with the master key, and a recovery kit. Needs the ticket from
 * a verified sign-up code.
 */
export const registerUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      keys: PasswordKeys
      recovery: RecoveryInput
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)

    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }
    const keys = parsePasswordKeys(data.keys)
    if (!keys || !isRecoveryInput(data.recovery)) {
      return { success: false, error: INVALID_REQUEST }
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
          ...passwordColumns(keys),
          ...recoveryColumns(data.recovery),
          createdAt: now,
        })
        .run()
      saveDevice(tx, userId, data.device)
      consumeTicket(verification.id, tx)
    })

    startSession(userId)

    return { success: true, user: { id: userId, email } }
  })

/**
 * Sign in by comparing the client-derived authKey. Also used to unlock an
 * already signed-in vault. Returns the wrapped vault key (null for vaults
 * made before it existed), which only the master key can open.
 */
export const loginUser = createServerFn({ method: 'POST' })
  .validator((data: { email: string; authKey: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const user = db.select().from(users).where(eq(users.email, email)).get()

    const check = verifySecret(email, data.authKey, user?.authHash)
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: (!check.ok && check.error) || INVALID_CREDENTIALS,
      }
    }

    startSession(user.id)

    return {
      success: true as const,
      user: { id: user.id, email: user.email },
      encryptedVaultKey: user.encryptedVaultKey,
    }
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
 * The signed-in user's salt, KDF settings and wrapped vault key, so the
 * browser can re-open the vault key when the master password is typed again
 * (new recovery kit, trusting this browser, changing the password). Only
 * for a signed-in session: the wrapped key is never handed out before
 * sign-in, so it can't be fetched by email and guessed at offline.
 */
export const getKeyMaterial = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireSessionUser()
    return {
      salt: user.salt,
      kdf: kdfFromRow(user),
      encryptedVaultKey: user.encryptedVaultKey,
    }
  },
)

/**
 * Set a new master password (or new KDF settings for the same password).
 * Only the wrapped vault key changes: the items, recovery kit and trusted
 * devices all use the vault key itself and keep working.
 *
 * A vault made before the random vault key also sends `rotation`: a new
 * vault key, every item re-encrypted with it and a new recovery kit. Other
 * trusted devices hold the old key, so they're dropped and trusted again the
 * next time they unlock; this browser stays trusted with the new key.
 *
 * `reason: 'upgrade'` is the automatic upgrade on unlock (same password), so
 * no "password changed" email is sent.
 */
export const changeMasterPassword = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      oldAuthKey: string
      keys: PasswordKeys
      rotation?: KeyRotation
      device?: DeviceInput
      reason?: 'password' | 'upgrade'
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

    const keys = parsePasswordKeys(data.keys)
    if (!keys) return { success: false, error: INVALID_REQUEST }

    let rotation: KeyRotation | null = null
    if (data.rotation || !user.encryptedVaultKey) {
      const parsed = parseRotation(user.id, data.rotation)
      if (!parsed.ok) return { success: false, error: parsed.error }
      rotation = parsed.rotation
    }

    db.transaction((tx) => {
      tx.update(users)
        .set({
          ...passwordColumns(keys),
          ...(rotation ? recoveryColumns(rotation.recovery) : {}),
        })
        .where(eq(users.id, user.id))
        .run()
      if (rotation) {
        writeReEncryptedItems(tx, user.id, rotation.items)
        deleteDevices(tx, user.id, deviceId(data.device))
        saveDevice(tx, user.id, data.device)
      }
    })

    if (data.reason !== 'upgrade') {
      void sendSecurityAlert(user.email, 'changed')
    }

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

    if (!isRecoveryInput(data.recovery)) {
      return { success: false, error: INVALID_REQUEST }
    }

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
  if (proof?.kind !== 'recoveryKey' || !isAuthKey(proof.authKey)) {
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
 * of the recovery key or a trusted device, and receive the wrapped vault
 * key. Both are needed: a found recovery kit or a stolen laptop alone isn't
 * enough. A vault made before the random vault key also gets its encrypted
 * items, so the browser can re-encrypt them under a new vault key.
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

    const needsRotation = !user.encryptedVaultKey
    const items = needsRotation
      ? db
          .select()
          .from(vaultItems)
          .where(eq(vaultItems.userId, user.id))
          .all()
          .map(toClientRow)
      : []

    return {
      success: true as const,
      wrappedKey: check.wrappedKey,
      needsRotation,
      items,
    }
  })

/**
 * Recovery step 2: set the new master password (wrapping the same vault
 * key) and a fresh recovery kit, sign out every other session, drop other
 * trusted devices and sign in. A vault made before the random vault key
 * also sends its items re-encrypted with a new vault key.
 */
export const completeRecovery = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      proof: RecoveryProof
      keys: PasswordKeys
      newRecovery: RecoveryInput
      reEncryptedItems?: ReEncryptedItem[]
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const keys = parsePasswordKeys(data.keys)
    if (!keys || !isRecoveryInput(data.newRecovery)) {
      return { success: false as const, error: INVALID_REQUEST }
    }
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

    let reEncrypted: ReEncryptedItem[] = []
    if (!user.encryptedVaultKey || data.reEncryptedItems) {
      const parsed = parseRotation(user.id, {
        items: data.reEncryptedItems,
        recovery: data.newRecovery,
      })
      if (!parsed.ok) return { success: false as const, error: parsed.error }
      reEncrypted = parsed.rotation.items
    }

    db.transaction((tx) => {
      tx.update(users)
        .set({
          ...passwordColumns(keys),
          ...recoveryColumns(data.newRecovery),
        })
        .where(eq(users.id, user.id))
        .run()
      writeReEncryptedItems(tx, user.id, reEncrypted)
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
 * a new, empty vault with a new vault key, master password and recovery
 * kit. Nothing is deleted: the old items are locked away, still encrypted
 * with the old vault key, and can be restored from Settings with the old
 * password, the old recovery key or a device trusted before the reset.
 */
export const resetAccount = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      keys: PasswordKeys
      recovery: RecoveryInput
      device?: DeviceInput
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const keys = parsePasswordKeys(data.keys)
    if (!keys || !isRecoveryInput(data.recovery)) {
      return { success: false as const, error: INVALID_REQUEST }
    }
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
          ...passwordColumns(keys),
          ...recoveryColumns(data.recovery),
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
