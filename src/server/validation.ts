import { type KdfParams, parseKdf } from '../lib/kdf'

/**
 * Checks for values the browser sends. The server can't read the vault, but
 * it can refuse values that would weaken it (a 1-iteration KDF, an empty
 * salt) or that no honest client produces, so a modified client or a direct
 * request can't store them.
 */

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

function base64Length(value: unknown): number | null {
  if (typeof value !== 'string' || value.length % 4 !== 0) return null
  if (!BASE64.test(value)) return null
  return Buffer.from(value, 'base64').length
}

/** The SHA-256 hex token the browser derives from a secret. */
export function isAuthKey(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

/** A KDF salt: 16 to 64 random bytes, base64. */
export function isSalt(value: unknown): value is string {
  const length = base64Length(value)
  return length !== null && length >= 16 && length <= 64
}

export function isItemId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
}

/** Biggest encrypted item accepted (attachments aren't supported). */
export const MAX_ITEM_BYTES = 512 * 1024
/** Most items in one import or re-encryption request. */
export const MAX_BATCH_ITEMS = 10_000

/**
 * Output of encryptData in src/lib/crypto.ts: JSON with a 12-byte IV and an
 * AES-GCM ciphertext (at least the 16-byte tag), both base64.
 */
export function isEncryptedPayload(
  value: unknown,
  maxLength = MAX_ITEM_BYTES,
): value is string {
  if (typeof value !== 'string' || value.length > maxLength) return false
  try {
    const payload = JSON.parse(value) as Record<string, unknown>
    if (!payload || typeof payload !== 'object') return false
    const keys = Object.keys(payload)
    if (keys.length !== 2) return false
    const ivLength = base64Length(payload.iv)
    const cipherLength = base64Length(payload.ciphertext)
    return ivLength === 12 && cipherLength !== null && cipherLength >= 16
  } catch {
    return false
  }
}

/** A 32-byte key wrapped with encryptData (vault key, recovery, device). */
export function isWrappedKey(value: unknown): value is string {
  return isEncryptedPayload(value, 512)
}

export interface RecoveryInput {
  authKey: string
  wrappedKey: string
}

export function isRecoveryInput(value: unknown): value is RecoveryInput {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  return isAuthKey(r.authKey) && isWrappedKey(r.wrappedKey)
}

export interface ReEncryptedItem {
  id: string
  encryptedData: string
}

/** A list of re-encrypted items, or null if any entry is malformed. */
export function parseItemList(value: unknown): ReEncryptedItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_BATCH_ITEMS) return null
  const items: ReEncryptedItem[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null
    const { id, encryptedData } = entry as Record<string, unknown>
    if (!isItemId(id) || !isEncryptedPayload(encryptedData)) return null
    items.push({ id, encryptedData })
  }
  return items
}

/**
 * What the browser sends when it sets a master password: the salt, KDF
 * settings and auth key for the new password, and the vault key wrapped
 * with the matching master key.
 */
export interface PasswordKeysInput {
  salt: string
  kdf: KdfParams
  authKey: string
  encryptedVaultKey: string
}

export function parsePasswordKeys(input: unknown): PasswordKeysInput | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const kdf = parseKdf(value.kdf)
  if (
    !kdf ||
    !isSalt(value.salt) ||
    !isAuthKey(value.authKey) ||
    !isWrappedKey(value.encryptedVaultKey)
  ) {
    return null
  }
  return {
    salt: value.salt,
    kdf,
    authKey: value.authKey,
    encryptedVaultKey: value.encryptedVaultKey,
  }
}

/** The users / locked_vaults columns for a set of KDF settings. */
export function kdfColumns(kdf: KdfParams) {
  return {
    kdfAlgorithm: kdf.algorithm,
    kdfIterations: kdf.iterations,
    kdfMemoryKiB: kdf.memoryKiB,
    kdfParallelism: kdf.parallelism,
  }
}

/** KDF settings from a users / locked_vaults row. */
export function kdfFromRow(row: {
  kdfAlgorithm: string
  kdfIterations: number
  kdfMemoryKiB: number
  kdfParallelism: number
}): KdfParams {
  return {
    algorithm: row.kdfAlgorithm as KdfParams['algorithm'],
    iterations: row.kdfIterations,
    memoryKiB: row.kdfMemoryKiB,
    parallelism: row.kdfParallelism,
  }
}

export const INVALID_REQUEST = 'Invalid request. Reload the page and try again.'
