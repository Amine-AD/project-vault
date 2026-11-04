import crypto from 'node:crypto'
import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm'
import { db } from '../db'
import { emailVerifications } from '../db/schema'
import { takeQuota } from './rate-limit'
import { clientIp } from './request'

/**
 * Email ownership checks for sign-up and recovery.
 *
 * 1. `issueCode` stores the hash of a 6-digit code. A row is written for every
 *    request, even when no code is emailed (an existing account signing up,
 *    or an unknown address recovering), so the responses and rate limits look
 *    the same either way and nobody can probe which emails have vaults.
 * 2. `verifyCode` checks the code (5 tries) and swaps it for a random ticket.
 * 3. The next step presents the ticket (`findTicket`), and the final step
 *    marks it used (`consumeTicket`) so it works only once.
 */

export type VerificationPurpose = 'signup' | 'recovery'

const CODE_TTL_MS = 10 * 60 * 1000
const TICKET_TTL_MS = 30 * 60 * 1000
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 45 * 1000
const MAX_CODES_PER_EMAIL_PER_HOUR = 5
const MAX_CODES_PER_IP_PER_HOUR = 20
const HOUR_MS = 60 * 60 * 1000

export class VerificationError extends Error {}

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function codeHash(email: string, purpose: VerificationPurpose, code: string) {
  return hash(`${purpose}:${email}:${code}`)
}

function sameHash(a: string, b: string) {
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

/**
 * Creates a fresh code for the email, replacing any earlier one. Returns the
 * plain code, to email if appropriate. Throws VerificationError when the
 * email or caller is sending too often.
 */
export function issueCode(email: string, purpose: VerificationPurpose) {
  const now = Date.now()
  const recent = db
    .select({ createdAt: emailVerifications.createdAt })
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        gt(emailVerifications.createdAt, now - HOUR_MS),
      ),
    )
    .orderBy(desc(emailVerifications.createdAt))
    .all()

  const last = recent[0]?.createdAt
  if (last && now - last < RESEND_COOLDOWN_MS) {
    const seconds = Math.ceil((last + RESEND_COOLDOWN_MS - now) / 1000)
    throw new VerificationError(
      `Wait ${seconds} seconds before asking for another code.`,
    )
  }
  if (
    recent.length >= MAX_CODES_PER_EMAIL_PER_HOUR ||
    !takeQuota(`email-code:${clientIp()}`, MAX_CODES_PER_IP_PER_HOUR, HOUR_MS)
  ) {
    throw new VerificationError(
      'Too many codes requested. Try again in an hour.',
    )
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')

  db.transaction((tx) => {
    // Old rows are no use once past every limit and expiry
    tx.delete(emailVerifications)
      .where(lt(emailVerifications.createdAt, now - 24 * HOUR_MS))
      .run()
    // Only the newest code works
    tx.update(emailVerifications)
      .set({ consumedAt: now })
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.purpose, purpose),
          isNull(emailVerifications.consumedAt),
        ),
      )
      .run()
    tx.insert(emailVerifications)
      .values({
        id: crypto.randomUUID(),
        email,
        purpose,
        codeHash: codeHash(email, purpose, code),
        expiresAt: now + CODE_TTL_MS,
        createdAt: now,
      })
      .run()
  })

  return code
}

/** Checks a code and returns a ticket for the next step. */
export function verifyCode(
  email: string,
  purpose: VerificationPurpose,
  code: string,
) {
  const now = Date.now()
  const row = db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        isNull(emailVerifications.consumedAt),
        isNull(emailVerifications.verifiedAt),
      ),
    )
    .orderBy(desc(emailVerifications.createdAt))
    .get()

  if (!row || row.expiresAt < now) {
    throw new VerificationError('That code has expired. Send a new one.')
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new VerificationError('Too many wrong codes. Send a new one.')
  }

  const digits = code.replace(/\D/g, '')
  if (
    digits.length !== 6 ||
    !sameHash(codeHash(email, purpose, digits), row.codeHash)
  ) {
    const attempts = row.attempts + 1
    db.update(emailVerifications)
      .set({ attempts })
      .where(eq(emailVerifications.id, row.id))
      .run()
    throw new VerificationError(
      attempts >= MAX_ATTEMPTS
        ? 'Too many wrong codes. Send a new one.'
        : "That code isn't right. Check the email and try again.",
    )
  }

  const ticket = crypto.randomBytes(32).toString('hex')
  db.update(emailVerifications)
    .set({
      verifiedAt: now,
      ticketHash: hash(ticket),
      expiresAt: now + TICKET_TTL_MS,
    })
    .where(eq(emailVerifications.id, row.id))
    .run()

  return ticket
}

/** The verification a still-valid ticket belongs to, or null. */
export function findTicket(
  email: string,
  purpose: VerificationPurpose,
  ticket: string,
) {
  if (!/^[0-9a-f]{64}$/.test(ticket)) return null
  const row = db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.email, email),
        eq(emailVerifications.purpose, purpose),
        eq(emailVerifications.ticketHash, hash(ticket)),
        isNull(emailVerifications.consumedAt),
      ),
    )
    .get()
  if (!row || !row.verifiedAt || row.expiresAt < Date.now()) return null
  return row
}

export const TICKET_EXPIRED =
  'Your email confirmation expired. Start again to get a new code.'

/** Marks a ticket used. Pass the transaction when inside one. */
export function consumeTicket(
  id: string,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) {
  tx.update(emailVerifications)
    .set({ consumedAt: Date.now() })
    .where(eq(emailVerifications.id, id))
    .run()
}
