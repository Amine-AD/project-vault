import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  salt: text('salt').notNull(),
  authHash: text('auth_hash').notNull(),
  kdfIterations: integer('kdf_iterations').notNull().default(600000),
  // Recovery kit (all null until the user creates one)
  recoveryAuthHash: text('recovery_auth_hash'),
  recoveryWrappedKey: text('recovery_wrapped_key'),
  recoveryCreatedAt: integer('recovery_created_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const vaultItems = sqliteTable('vault_items', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Legacy plaintext metadata. New writes store neutral values; the real
  // type, favorite flag and tags live inside encryptedData.
  type: text('type').notNull(), // 'item' (or legacy 'login' | 'note')
  encryptedData: text('encrypted_data').notNull(), // JSON: { iv: string, ciphertext: string }
  isFavorite: integer('is_favorite').notNull().default(0), // 0 or 1
  tags: text('tags').notNull().default('[]'), // JSON array string
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

/**
 * One-time email codes. A code proves the person owns the address; once
 * verified it is swapped for a short-lived ticket the next step must present.
 * Only hashes are stored.
 */
export const emailVerifications = sqliteTable('email_verifications', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  purpose: text('purpose').notNull(), // 'signup' | 'recovery'
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  verifiedAt: integer('verified_at'),
  ticketHash: text('ticket_hash'),
  consumedAt: integer('consumed_at'),
  createdAt: integer('created_at').notNull(),
})

/**
 * Browsers that can recover the vault without the master password. Each
 * keeps a non-extractable device key in IndexedDB; the server keeps the vault
 * key encrypted with it. Neither half opens the vault alone, and recovery
 * also needs a verified email code.
 */
export const trustedDevices = sqliteTable('trusted_devices', {
  id: text('id').primaryKey(), // random id made by the browser
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g. "Chrome on Windows"
  authHash: text('auth_hash').notNull(), // bcrypt of the device's proof token
  wrappedKey: text('wrapped_key').notNull(), // vault key, encrypted on-device
  createdAt: integer('created_at').notNull(),
  lastUsedAt: integer('last_used_at').notNull(),
})

/**
 * A vault set aside by a reset without the recovery key. Its items stay
 * encrypted with the old master password, so the user can bring them back
 * later with the old password, the old recovery key or a device trusted
 * before the reset.
 */
export const lockedVaults = sqliteTable('locked_vaults', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  salt: text('salt').notNull(),
  kdfIterations: integer('kdf_iterations').notNull(),
  authHash: text('auth_hash').notNull(),
  recoveryAuthHash: text('recovery_auth_hash'),
  recoveryWrappedKey: text('recovery_wrapped_key'),
  devices: text('devices').notNull().default('[]'), // JSON: LockedVaultDevice[]
  items: text('items').notNull().default('[]'), // JSON: VaultItemRow[]
  itemCount: integer('item_count').notNull(),
  lockedAt: integer('locked_at').notNull(),
})

export interface LockedVaultDevice {
  id: string
  authHash: string
  wrappedKey: string
}

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type VaultItemRow = typeof vaultItems.$inferSelect
export type NewVaultItemRow = typeof vaultItems.$inferInsert
export type TrustedDevice = typeof trustedDevices.$inferSelect
export type LockedVault = typeof lockedVaults.$inferSelect
