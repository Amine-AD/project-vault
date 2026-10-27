import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { db } from '../db'
import { sessions, users, vaultItems } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import crypto from 'node:crypto'

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

export interface EncryptedVaultItemInput {
  id?: string
  type: 'login' | 'note'
  encryptedData: string
  isFavorite: boolean
  tags: string[]
}

/**
 * Fetch all encrypted items belonging to the current user
 */
export const getEncryptedVaultItems = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireUser()

    const items = db
      .select()
      .from(vaultItems)
      .where(eq(vaultItems.userId, user.id))
      .orderBy(desc(vaultItems.updatedAt))
      .all()

    return items.map((row) => ({
      id: row.id,
      type: row.type as 'login' | 'note',
      encryptedData: row.encryptedData,
      isFavorite: row.isFavorite === 1,
      tags: JSON.parse(row.tags || '[]') as string[],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  }
)

/**
 * Create or update an encrypted vault item
 */
export const saveVaultItem = createServerFn({ method: 'POST' })
  .validator((data: EncryptedVaultItemInput) => data)
  .handler(async ({ data }) => {
    const user = requireUser()
    const now = Date.now()
    const itemId = data.id || crypto.randomUUID()
    const tagsJson = JSON.stringify(data.tags || [])
    const favInt = data.isFavorite ? 1 : 0

    const existing = db
      .select()
      .from(vaultItems)
      .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, user.id)))
      .get()

    if (existing) {
      db.update(vaultItems)
        .set({
          type: data.type,
          encryptedData: data.encryptedData,
          isFavorite: favInt,
          tags: tagsJson,
          updatedAt: now,
        })
        .where(and(eq(vaultItems.id, itemId), eq(vaultItems.userId, user.id)))
        .run()
    } else {
      db.insert(vaultItems)
        .values({
          id: itemId,
          userId: user.id,
          type: data.type,
          encryptedData: data.encryptedData,
          isFavorite: favInt,
          tags: tagsJson,
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
      .where(and(eq(vaultItems.id, data.id), eq(vaultItems.userId, user.id)))
      .run()

    return { success: true }
  })

/**
 * Batch import encrypted items
 */
export const batchImportVaultItems = createServerFn({ method: 'POST' })
  .validator((data: { items: EncryptedVaultItemInput[] }) => data)
  .handler(async ({ data }) => {
    const user = requireUser()
    const now = Date.now()

    for (const item of data.items) {
      const itemId = item.id || crypto.randomUUID()
      db.insert(vaultItems)
        .values({
          id: itemId,
          userId: user.id,
          type: item.type,
          encryptedData: item.encryptedData,
          isFavorite: item.isFavorite ? 1 : 0,
          tags: JSON.stringify(item.tags || []),
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    return { success: true, count: data.items.length }
  })

/**
 * Delete all vault items for current user
 */
export const deleteAllVaultItems = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = requireUser()
    db.delete(vaultItems).where(eq(vaultItems.userId, user.id)).run()
    return { success: true }
  }
)

