import type { VaultItemRow } from '../db/schema'

/**
 * Pure helpers for vault item rows, shared by the server functions. No
 * database access here, so it is safe for the client bundle to see.
 */

/**
 * A row as sent to the client: ciphertext plus timestamps. The item's type,
 * favorite flag and tags are inside the ciphertext, so the server can't tell
 * logins from notes or see what's starred or how items are tagged.
 */
export function toClientRow(row: VaultItemRow) {
  return {
    id: row.id,
    encryptedData: row.encryptedData,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export type ClientVaultRow = ReturnType<typeof toClientRow>
