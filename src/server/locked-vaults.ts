import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { lockedVaults, vaultItems } from '../db/schema'
import { requireSessionUser, verifySecret } from './guards'
import { toClientRow } from './item-rows'
import {
  checkLockedVaultProof,
  type LockedVaultProof,
  lockedVaultDevices,
  lockedVaultItems,
} from './recovery-store'
import { INVALID_REQUEST, kdfFromRow, parseItemList } from './validation'

/**
 * Vaults set aside by a reset without the recovery key. Their items stay
 * encrypted with the old vault key; the browser opens it with the old
 * password, old recovery key or a device trusted before the reset,
 * re-encrypts the items with the current vault key and sends them back.
 */

function findLockedVault(userId: string, id: string) {
  return db
    .select()
    .from(lockedVaults)
    .where(
      and(
        eq(lockedVaults.id, String(id ?? '')),
        eq(lockedVaults.userId, userId),
      ),
    )
    .get()
}

const NOT_FOUND = 'This locked vault no longer exists.'

/** The signed-in user's locked vaults, newest first. */
export const listLockedVaults = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireSessionUser()
    return db
      .select()
      .from(lockedVaults)
      .where(eq(lockedVaults.userId, user.id))
      .orderBy(desc(lockedVaults.lockedAt))
      .all()
      .map((vault) => ({
        id: vault.id,
        lockedAt: vault.lockedAt,
        itemCount: vault.itemCount,
        // Not secret: needed to derive the old key from the old password
        salt: vault.salt,
        kdf: kdfFromRow(vault),
        hasRecoveryKey: !!vault.recoveryWrappedKey,
        deviceIds: lockedVaultDevices(vault).map((d) => d.id),
      }))
  },
)

/**
 * Checks a proof and returns the locked items (still encrypted) plus the
 * wrapped old vault key for recovery key and device proofs.
 */
export const openLockedVault = createServerFn({ method: 'POST' })
  .validator((data: { id: string; proof: LockedVaultProof }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()
    const vault = findLockedVault(user.id, data.id)
    if (!vault) return { success: false as const, error: NOT_FOUND }

    const check = await checkLockedVaultProof(vault, data.proof)
    if (!check.ok) return { success: false as const, error: check.error }

    return {
      success: true as const,
      wrappedKey: check.wrappedKey,
      items: lockedVaultItems(vault).map(toClientRow),
    }
  })

/**
 * Moves the items into the live vault, re-encrypted with the current key,
 * and deletes the locked copy. Every locked item has to be sent, so nothing
 * is lost by a partial restore.
 */
export const restoreLockedVault = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      id: string
      proof: LockedVaultProof
      items: Array<{ id: string; encryptedData: string }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireSessionUser()
    const vault = findLockedVault(user.id, data.id)
    if (!vault) return { success: false as const, error: NOT_FOUND }

    const check = await checkLockedVaultProof(vault, data.proof)
    if (!check.ok) return { success: false as const, error: check.error }

    const items = parseItemList(data.items)
    if (!items) return { success: false as const, error: INVALID_REQUEST }

    const locked = lockedVaultItems(vault)
    const sent = new Map(items.map((i) => [i.id, i.encryptedData]))
    if (locked.some((row) => !sent.get(row.id))) {
      return {
        success: false as const,
        error: 'Some items were missing. Nothing was restored; try again.',
      }
    }

    // Ids are global; one taken since the reset gets a new id
    const taken = new Set(
      locked.length === 0
        ? []
        : db
            .select({ id: vaultItems.id })
            .from(vaultItems)
            .where(
              inArray(
                vaultItems.id,
                locked.map((row) => row.id),
              ),
            )
            .all()
            .map((row) => row.id),
    )

    db.transaction((tx) => {
      for (const row of locked) {
        tx.insert(vaultItems)
          .values({
            id: taken.has(row.id) ? crypto.randomUUID() : row.id,
            userId: user.id,
            encryptedData: sent.get(row.id) as string,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .run()
      }
      tx.delete(lockedVaults).where(eq(lockedVaults.id, vault.id)).run()
    })

    return { success: true as const, count: locked.length }
  })

/**
 * Permanently deletes a locked vault the user has given up on. Needs the
 * current master password (as its authKey): it may be the user's last copy
 * of those items, so a session alone mustn't be enough.
 */
export const deleteLockedVault = createServerFn({ method: 'POST' })
  .validator((data: { id: string; authKey: string }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()
    const check = await verifySecret(user.email, data.authKey, user.authHash)
    if (!check.ok) {
      return {
        success: false as const,
        error: check.error ?? 'Master password is incorrect.',
      }
    }
    db.delete(lockedVaults)
      .where(
        and(
          eq(lockedVaults.id, String(data.id ?? '')),
          eq(lockedVaults.userId, user.id),
        ),
      )
      .run()
    return { success: true as const }
  })
