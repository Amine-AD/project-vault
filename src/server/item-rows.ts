import type { VaultItemRow } from '../db/schema'
import type { ItemType } from '../types/vault'

/**
 * Pure helpers for vault item rows, shared by the server functions. No
 * database access here, so it is safe for the client bundle to see.
 */

/**
 * What the server stores in the old plaintext columns. The real type,
 * favorite flag and tags are inside encryptedData, so the server can't tell
 * logins from notes or see what's starred or how items are tagged.
 */
export const NEUTRAL_METADATA = {
  type: 'item',
  isFavorite: 0,
  tags: '[]',
} as const

/** A row as sent to the client: ciphertext plus timestamps. */
export function toClientRow(row: VaultItemRow) {
  return {
    id: row.id,
    encryptedData: row.encryptedData,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    /** Plaintext values from before metadata was encrypted (for migration). */
    legacy: {
      type: row.type === NEUTRAL_METADATA.type ? null : (row.type as ItemType),
      isFavorite: row.isFavorite === 1,
      tags: JSON.parse(row.tags || '[]') as string[],
    },
  }
}

export type ClientVaultRow = ReturnType<typeof toClientRow>
