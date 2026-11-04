import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { sessions, users, vaultItems } from '../db/schema'
import { NEUTRAL_METADATA, toClientRow } from './item-rows'
import {
  INVALID_REQUEST,
  isEncryptedPayload,
  isItemId,
  parseItemList,
} from './validation'

const SESSION_COOKIE_NAME = 'vault_session'

function requireUser() {
  const token = getCookie(SESSION_COOKIE_NAME)
  if (!token) {
    throw new Error('Unauthorized: No active session')
  }

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get()

  if (!session || session.expiresAt < Date.now()) {
    throw new Error('Unauthorized: Session expired')
  }

  const user = db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .get()

  if (!user) {
    throw new Error('Unauthorized: User not found')
  }

  return user
}

/**
 * Everything about an item except its id and timestamps is inside
 * encryptedData, including its type, favorite flag and tags.
 */
export interface EncryptedVaultItemInput {
  id?: string
  encryptedData: string
}

/**
 * Fetch all encrypted items belonging to the current user
 */
export const getEncryptedVaultItems = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireUser()

    return db
      .select()
      .from(vaultItems)
      .where(eq(vaultItems.userId, user.id))
      .orderBy(desc(vaultItems.updatedAt))
      .all()
      .map(toClientRow)
  },
)

/**
 * Create or update an encrypted vault item
 */
export const saveVaultItem = createServerFn({ method: 'POST' })
  .validator((data: EncryptedVaultItemInput) => data)
  .handler(async ({ data }) => {
    const user = requireUser()
    if (
      (data.id !== undefined && !isItemId(data.id)) ||
      !isEncryptedPayload(data.encryptedData)
    ) {
      throw new Error(INVALID_REQUEST)
    }
    const now = Date.now()
    const itemId = data.id || crypto.randomUUID()

    const existing = db
      .select()
      .from(vaultItems)
      .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, user.id)))
      .get()

    if (existing) {
      db.update(vaultItems)
        .set({
          ...NEUTRAL_METADATA,
          encryptedData: data.encryptedData,
          updatedAt: now,
        })
        .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, user.id)))
        .run()
    } else {
      db.insert(vaultItems)
        .values({
          ...NEUTRAL_METADATA,
          id: itemId,
          userId: user.id,
          encryptedData: data.encryptedData,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    return {
      success: true,
      id: itemId,
      updatedAt: now,
    }
  })

/**
 * Delete a vault item
 */
export const deleteVaultItem = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = requireUser()

    db.delete(vaultItems)
      .where(
        and(eq(vaultItems.id, String(data.id)), eq(vaultItems.userId, user.id)),
      )
      .run()

    return { success: true }
  })

/**
 * Batch import encrypted items
 */
export const batchImportVaultItems = createServerFn({ method: 'POST' })
  .validator(
    (data: { items: Array<{ id: string; encryptedData: string }> }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireUser()
    const items = parseItemList(data.items)
    if (!items) throw new Error(INVALID_REQUEST)
    const now = Date.now()

    db.transaction((tx) => {
      for (const item of items) {
        tx.insert(vaultItems)
          .values({
            ...NEUTRAL_METADATA,
            id: item.id,
            userId: user.id,
            encryptedData: item.encryptedData,
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }
    })

    return { success: true, count: items.length }
  })

/**
 * Delete all vault items for current user
 */
export const deleteAllVaultItems = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = requireUser()
    db.delete(vaultItems).where(eq(vaultItems.userId, user.id)).run()
    return { success: true }
  },
)

/**
 * One-time migration: replace items' ciphertext with a version that carries
 * their metadata, and neutralize the plaintext columns. Leaves updatedAt alone.
 */
export const rewrapVaultItems = createServerFn({ method: 'POST' })
  .validator(
    (data: { items: Array<{ id: string; encryptedData: string }> }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireUser()
    const items = parseItemList(data.items)
    if (!items) throw new Error(INVALID_REQUEST)

    db.transaction((tx) => {
      for (const item of items) {
        tx.update(vaultItems)
          .set({ ...NEUTRAL_METADATA, encryptedData: item.encryptedData })
          .where(
            and(eq(vaultItems.id, item.id), eq(vaultItems.userId, user.id)),
          )
          .run()
      }
    })

    return { success: true, count: items.length }
  })
