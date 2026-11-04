import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { eq, lt } from 'drizzle-orm'
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
  hashSecret,
  requireSessionUser,
  SESSION_COOKIE_NAME,
  sessionUser,
  verifySecret,
} from './guards'
import { recordSuccess } from './rate-limit'
import {
  checkDeviceProof,
  type DeviceInput,
  type DeviceProofInput,
  deleteDevices,
  deviceId,
  lockAwayVault,
  prepareDevice,
  saveDevice,
} from './recovery-store'
import { isHttps } from './request'
import { keyedHash } from './secrets'
import {
  INVALID_REQUEST,
  isAuthKey,
  isRecoveryInput,
  kdfColumns,
  kdfFromRow,
  type PasswordKeysInput,
  parsePasswordKeys,
  type RecoveryInput,
} from './validation'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const INVALID_CREDENTIALS = 'Invalid email or master password.'
const INVALID_RECOVERY = "That recovery key doesn't match this email."
const UNTRUSTED_DEVICE =
  'This browser isn’t a trusted device for this vault anymore. Use your recovery key instead.'

/** How a forgotten-password recovery proves it can open the vault. */
type RecoveryProof =
  | { kind: 'recoveryKey'; authKey: string }
  | ({ kind: 'device' } & DeviceProofInput)

/**
 * Salt, KDF settings and auth key for a master password, plus the vault key
 * wrapped with the master key derived from it. See src/lib/crypto.ts.
 */
type PasswordKeys = PasswordKeysInput

function normalizeEmail(email: string) {
  return String(email ?? '')
    .toLowerCase()
    .trim()
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Users columns for a new recovery kit. */
async function recoveryColumns(recovery: RecoveryInput) {
  return {
    recoveryAuthHash: await hashSecret(recovery.authKey),
    recoveryWrappedKey: recovery.wrappedKey,
    recoveryCreatedAt: Date.now(),
  }
}

/** Users columns for a new master password. */
async function passwordColumns(keys: PasswordKeys) {
  return {
    salt: keys.salt,
    ...kdfColumns(keys.kdf),
    // The client-derived authKey is hashed again before storage
    authHash: await hashSecret(keys.authKey),
    encryptedVaultKey: keys.encryptedVaultKey,
    updatedAt: Date.now(),
  }
}

/**
 * Creates a session row and sets the HttpOnly cookie. Replaces the session
 * this browser already had (unlocking signs in again, so it would otherwise
 * leave one more valid session behind every time), and clears out expired
 * sessions while at it.
 */
function startSession(userId: string) {
  const now = Date.now()
  const token = crypto.randomBytes(32).toString('hex')
  const previous = getCookie(SESSION_COOKIE_NAME)
  db.transaction((tx) => {
    if (previous) tx.delete(sessions).where(eq(sessions.token, previous)).run()
    tx.delete(sessions).where(lt(sessions.expiresAt, now)).run()
    tx.insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId,
        token,
        expiresAt: now + SESSION_DURATION_MS,
        createdAt: now,
      })
      .run()
  })
  setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Never sent over plain HTTP once the app is served over HTTPS. Left
    // off on plain HTTP so a self-hosted server on a home network still works.
    secure: isHttps(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  })
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
    const columns = {
      ...(await passwordColumns(keys)),
      ...(await recoveryColumns(data.recovery)),
    }
    const device = await prepareDevice(data.device)

    db.transaction((tx) => {
      tx.insert(users)
        .values({ id: userId, email, ...columns, createdAt: now })
        .run()
      saveDevice(tx, userId, device)
      consumeTicket(verification.id, tx)
    })

    startSession(userId)

    return { success: true, user: { id: userId, email } }
  })

/**
 * Sign in by comparing the client-derived authKey. Also used to unlock an
 * already signed-in vault. Returns the wrapped vault key, which only the
 * master key can open.
 */
export const loginUser = createServerFn({ method: 'POST' })
  .validator((data: { email: string; authKey: string }) => data)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)
    const user = db.select().from(users).where(eq(users.email, email)).get()

    const check = await verifySecret(email, data.authKey, user?.authHash)
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
 * `reason: 'upgrade'` is the automatic re-wrap on unlock when the KDF
 * defaults have been raised (same password), so no "password changed" email
 * is sent.
 */
export const changeMasterPassword = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      oldAuthKey: string
      keys: PasswordKeys
      reason?: 'password' | 'upgrade'
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireSessionUser()

    const check = await verifySecret(user.email, data.oldAuthKey, user.authHash)
    if (!check.ok) {
      return {
        success: false,
        error: check.error ?? 'Current master password is incorrect.',
      }
    }

    const keys = parsePasswordKeys(data.keys)
    if (!keys) return { success: false, error: INVALID_REQUEST }

    db.update(users)
      .set(await passwordColumns(keys))
      .where(eq(users.id, user.id))
      .run()

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

    const check = await verifySecret(user.email, data.authKey, user.authHash)
    if (!check.ok) {
      return {
        success: false,
        error: check.error ?? 'Master password is incorrect.',
      }
    }

    const columns = await recoveryColumns(data.recovery)
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
async function checkRecoveryProof(
  email: string,
  user: ReturnType<typeof findUser>,
  proof: RecoveryProof,
): Promise<{ ok: true; wrappedKey: string } | { ok: false; error: string }> {
  if (proof?.kind === 'device') {
    const check = await checkDeviceProof(email, user, proof)
    return check.ok
      ? check
      : { ok: false, error: check.error ?? UNTRUSTED_DEVICE }
  }
  if (proof?.kind !== 'recoveryKey' || !isAuthKey(proof.authKey)) {
    return { ok: false, error: 'Invalid request.' }
  }
  const check = await verifySecret(
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
 * enough.
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

    const check = await checkRecoveryProof(email, user, data.proof)
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: check.ok ? INVALID_RECOVERY : check.error,
      }
    }

    return { success: true as const, wrappedKey: check.wrappedKey }
  })

/**
 * Recovery step 2: set the new master password (wrapping the same vault
 * key) and a fresh recovery kit, sign out every other session, drop other
 * trusted devices and sign in.
 */
export const completeRecovery = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      ticket: string
      proof: RecoveryProof
      keys: PasswordKeys
      newRecovery: RecoveryInput
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

    const check = await checkRecoveryProof(email, user, data.proof)
    if (!check.ok || !user) {
      return {
        success: false as const,
        error: check.ok ? INVALID_RECOVERY : check.error,
      }
    }

    const columns = {
      ...(await passwordColumns(keys)),
      ...(await recoveryColumns(data.newRecovery)),
    }
    const device = await prepareDevice(data.device)

    db.transaction((tx) => {
      tx.update(users).set(columns).where(eq(users.id, user.id)).run()
      // Whoever was signed in with the forgotten password is signed out
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
      deleteDevices(tx, user.id, deviceId(data.device))
      saveDevice(tx, user.id, device)
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

    const columns = {
      ...(await passwordColumns(keys)),
      ...(await recoveryColumns(data.recovery)),
    }
    const device = await prepareDevice(data.device)

    let lockedItemCount = 0
    db.transaction((tx) => {
      lockedItemCount = lockAwayVault(tx, user)
      tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
      tx.update(users).set(columns).where(eq(users.id, user.id)).run()
      saveDevice(tx, user.id, device)
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

    const check = await verifySecret(user.email, data.authKey, user.authHash)
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
