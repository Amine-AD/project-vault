import crypto from 'node:crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from './schema'

/**
 * Applies the migrations in drizzle/ (written by `npm run db:generate`) when
 * the server starts. They're bundled into the server build rather than read
 * from disk, so they run wherever the server is started from (Docker, a
 * service, another folder). Each runs once, in order, inside a transaction.
 */

interface MigrationMeta {
  sql: string[]
  bps: boolean
  folderMillis: number
  hash: string
}

interface Journal {
  entries: Array<{
    idx: number
    when: number
    tag: string
    breakpoints: boolean
  }>
}

const MIGRATIONS_TABLE = '__drizzle_migrations'

const sqlFiles = import.meta.glob<string>('../../drizzle/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const journal = Object.values(
  import.meta.glob<Journal>('../../drizzle/meta/_journal.json', {
    import: 'default',
    eager: true,
  }),
)[0]

/** The same list drizzle-orm's file-based migrator builds. */
function bundledMigrations(): MigrationMeta[] {
  if (!journal) throw new Error('drizzle/meta/_journal.json is missing.')
  return journal.entries.map((entry) => {
    const query = sqlFiles[`../../drizzle/${entry.tag}.sql`]
    if (query === undefined) {
      throw new Error(`Migration drizzle/${entry.tag}.sql is missing.`)
    }
    return {
      sql: query.split('--> statement-breakpoint'),
      bps: entry.breakpoints,
      folderMillis: entry.when,
      hash: crypto.createHash('sha256').update(query).digest('hex'),
    }
  })
}

export function runMigrations(db: BetterSQLite3Database<typeof schema>) {
  const migrations = bundledMigrations()
  // What drizzle-orm's migrate() does after reading the files from disk
  const internal = db as unknown as {
    dialect: {
      migrate: (m: MigrationMeta[], session: unknown, config: object) => void
    }
    session: unknown
  }
  internal.dialect.migrate(migrations, internal.session, {
    migrationsTable: MIGRATIONS_TABLE,
  })
}
