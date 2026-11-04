import { defineConfig } from 'drizzle-kit'

/**
 * drizzle-kit writes a migration for every change to src/db/schema.ts:
 *
 *   npm run db:generate -- --name short_description
 *
 * Commit the new files in drizzle/. The app applies pending migrations by
 * itself when it starts (src/db/migrate.ts), so self-hosters only update
 * and restart. Never edit or delete a migration that has been released.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
