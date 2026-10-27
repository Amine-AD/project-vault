import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { db } from '../db'
import { users, sessions, vaultItems } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'vault_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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
 * Register user with salt and client-derived authKey
 */
export const registerUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      email: string
      salt: string
      authKey: string
      kdfIterations?: number
    }) => data
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()

    // Validate email format
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    // Check if user already exists
    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' }
    }

    // Hash the client-derived authKey on server before storage
    const authHash = bcrypt.hashSync(data.authKey, 10)
    const userId = crypto.randomUUID()
    const now = Date.now()
    const iterations = data.kdfIterations || 600000

    db.insert(users)
      .values({
        id: userId,
        email,
        salt: data.salt,
        authHash,
        kdfIterations: iterations,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = now + SESSION_DURATION_MS

    db.insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId,
        token: sessionToken,
        expiresAt,
        createdAt: now,
      })
      .run()

    // Set HttpOnly session cookie
    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    })

    return {
      success: true,
      user: {
        id: userId,
        email,
      },
    }
  })

/**
 * Login user by comparing client-derived authKey
 */
export const loginUser = createServerFn({ method: 'POST' })
  .validator((data: { email: string; authKey: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()
    const user = db.select().from(users).where(eq(users.email, email)).get()

    if (!user) {
      return { success: false, error: 'Invalid email or master password.' }
    }

    const matches = bcrypt.compareSync(data.authKey, user.authHash)
    if (!matches) {
      return { success: false, error: 'Invalid email or master password.' }
    }

    const now = Date.now()
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = now + SESSION_DURATION_MS

    db.insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        token: sessionToken,
        expiresAt,
        createdAt: now,
      })
      .run()

    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
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
  }
)

/**
 * Get current session user
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) {
      return { user: null }
    }

    const session = db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .get()

    if (!session || session.expiresAt < Date.now()) {
      deleteCookie(SESSION_COOKIE_NAME, { path: '/' })
      return { user: null }
    }

    const user = db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, session.userId))
      .get()

    if (!user) {
      deleteCookie(SESSION_COOKIE_NAME, { path: '/' })
      return { user: null }
    }

    return { user }
  }
)

/**
 * Change master password and update all re-encrypted items
 */
export const changeMasterPassword = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      oldAuthKey: string
      newSalt: string
      newAuthKey: string
      reEncryptedItems: Array<{ id: string; encryptedData: string }>
    }) => data
  )
  .handler(async ({ data }) => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) throw new Error('Unauthorized')

    const session = db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .get()

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Unauthorized')
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get()

    if (!user) throw new Error('User not found')

    const matches = bcrypt.compareSync(data.oldAuthKey, user.authHash)
    if (!matches) {
      return { success: false, error: 'Current master password is incorrect.' }
    }

    const newAuthHash = bcrypt.hashSync(data.newAuthKey, 10)
    const now = Date.now()

    db.transaction((tx) => {
      tx.update(users)
        .set({
          salt: data.newSalt,
          authHash: newAuthHash,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
        .run()

      for (const item of data.reEncryptedItems) {
        tx.update(vaultItems)
          .set({
            encryptedData: item.encryptedData,
            updatedAt: now,
          })
          .where(and(eq(vaultItems.id, item.id), eq(vaultItems.userId, user.id)))
          .run()
      }
    })

    return { success: true }
  })

