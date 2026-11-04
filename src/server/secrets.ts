import './env'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { appMeta } from '../db/schema'

/**
 * A secret unique to this server, for keyed hashes that must not be
 * computable by anyone reading the (public) source code, such as the stand-in
 * salts that hide which emails have a vault.
 *
 * Set APP_SECRET (32+ characters) to choose it yourself, e.g. when running
 * several servers against one database. Otherwise a random one is made on
 * first use and kept in the database, so self-hosters don't need to set
 * anything. Changing it only changes the stand-in salts.
 */

const META_KEY = 'server_secret'
let cached: Buffer | null = null

export function serverSecret(): Buffer {
  if (cached) return cached

  const fromEnv = process.env.APP_SECRET?.trim()
  if (fromEnv) {
    if (fromEnv.length < 32) {
      throw new Error('APP_SECRET must be at least 32 characters long.')
    }
    cached = Buffer.from(fromEnv, 'utf8')
    return cached
  }

  const stored = db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, META_KEY))
    .get()
  if (stored) {
    cached = Buffer.from(stored.value, 'base64')
    return cached
  }

  const fresh = crypto.randomBytes(32).toString('base64')
  // Another request may have created it first; whichever row exists wins
  db.insert(appMeta)
    .values({ key: META_KEY, value: fresh })
    .onConflictDoNothing()
    .run()
  const saved = db.select().from(appMeta).where(eq(appMeta.key, META_KEY)).get()
  cached = Buffer.from(saved?.value ?? fresh, 'base64')
  return cached
}

/** HMAC-SHA256 of `message` under the server secret, for one `purpose`. */
export function keyedHash(purpose: string, message: string): Buffer {
  return crypto
    .createHmac('sha256', serverSecret())
    .update(`${purpose}\u0000${message}`)
    .digest()
}
