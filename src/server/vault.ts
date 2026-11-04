import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { vaultItems } from '../db/schema'
import { requireSessionUser, verifySecret } from './guards'
import { toClientRow } from './item-rows'
import {
  INVALID_REQUEST,
  isEncryptedPayload,
  isItemId,
  parseItemList,
} from './validation'

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
    const user = requireSessionUser()

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
    const user = requireSessionUser()
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
          encryptedData: data.encryptedData,
          updatedAt: now,
        })
        .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, user.id)))
        .run()
    } else {
      db.insert(vaultItems)
        .values({
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
    const user = requireSessionUser()

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
    const user = requireSessionUser()
    const items = parseItemList(data.items)
    if (!items) throw new Error(INVALID_REQUEST)
    const now = Date.now()

    db.transaction((tx) => {
      for (const item of items) {
        tx.insert(vaultItems)
          .values({
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
 * Delete all vault items for current user. Needs the master password (as its
 * authKey): a session alone, e.g. a stolen cookie or a locked laptop, mustn't
 * be enough to wipe the vault.
 */
export const deleteAllVaultItems = createServerFn({ method: 'POST' })
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
    db.delete(vaultItems).where(eq(vaultItems.userId, user.id)).run()
    return { success: true as const }
  })
