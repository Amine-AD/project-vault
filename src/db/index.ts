import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dbPath = path.resolve(process.cwd(), 'vault.db')

// Create SQLite connection
const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrency and reliability
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Ensure tables exist automatically on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    auth_hash TEXT NOT NULL,
    kdf_iterations INTEGER NOT NULL DEFAULT 600000,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    verified_at INTEGER,
    ticket_hash TEXT,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trusted_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    auth_hash TEXT NOT NULL,
    wrapped_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS locked_vaults (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salt TEXT NOT NULL,
    kdf_iterations INTEGER NOT NULL,
    auth_hash TEXT NOT NULL,
    recovery_auth_hash TEXT,
    recovery_wrapped_key TEXT,
    devices TEXT NOT NULL DEFAULT '[]',
    items TEXT NOT NULL DEFAULT '[]',
    item_count INTEGER NOT NULL,
    locked_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id
    ON trusted_devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_locked_vaults_user_id
    ON locked_vaults(user_id);
  CREATE INDEX IF NOT EXISTS idx_email_verifications_email
    ON email_verifications(email, purpose);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
`)

// Columns added after the first release
const userColumns = new Set(
  (sqlite.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(
    (column) => column.name,
  ),
)
for (const [name, type] of [
  ['recovery_auth_hash', 'TEXT'],
  ['recovery_wrapped_key', 'TEXT'],
  ['recovery_created_at', 'INTEGER'],
]) {
  if (!userColumns.has(name)) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`)
  }
}

export const db = drizzle(sqlite, { schema })
