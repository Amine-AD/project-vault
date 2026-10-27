import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  salt: text('salt').notNull(),
  authHash: text('auth_hash').notNull(),
  kdfIterations: integer('kdf_iterations').notNull().default(600000),
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
  type: text('type').notNull(), // 'login' | 'note'
  encryptedData: text('encrypted_data').notNull(), // JSON: { iv: string, ciphertext: string }
  isFavorite: integer('is_favorite').notNull().default(0), // 0 or 1
  tags: text('tags').notNull().default('[]'), // JSON array string
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type VaultItemRow = typeof vaultItems.$inferSelect
export type NewVaultItemRow = typeof vaultItems.$inferInsert
