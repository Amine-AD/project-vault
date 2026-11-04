import '../server/env'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { runMigrations } from './migrate'
import * as schema from './schema'

/**
 * The database file: DATABASE_PATH if set (e.g. /data/vault.db on a Docker
 * volume), otherwise vault.db in the folder the server is started from.
 * Relative paths are resolved from that folder too. Its folder is created
 * if needed.
 */
const dbPath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH?.trim() || 'vault.db',
)
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

// WAL lets reads continue while a write is in progress
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Creates the tables on first run and applies any newer migrations
runMigrations(db)
console.info(`[db] Using ${dbPath}`)
