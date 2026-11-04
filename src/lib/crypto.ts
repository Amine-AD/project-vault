import * as OTPAuth from 'otpauth'
import type { KdfParams } from './kdf'

// Convert ArrayBuffer / Uint8Array to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Convert ArrayBuffer to Hex String
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generates a random cryptographic salt (16 bytes, Base64 encoded)
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16)
  window.crypto.getRandomValues(salt)
  return bufferToBase64(salt)
}

/**
 * Runs the account's KDF on the master password and splits the 64-byte
 * result:
 * 1. Master key (first 32 bytes): AES-256-GCM key that wraps the vault key.
 *    It never leaves the browser. In vaults made before the random vault key
 *    (no encryptedVaultKey on the server), it encrypts the items directly.
 * 2. Auth key (last 32 bytes, SHA-256 hashed): sent to the server to sign in.
 *    The server bcrypt-hashes it again; it can't be turned into the master
 *    key.
 */
export async function deriveMasterKey(
  masterPassword: string,
  saltBase64: string,
  kdf: KdfParams,
): Promise<{
  masterKey: CryptoKey
  rawMasterKey: Uint8Array
  authKey: string
}> {
  const derivedBytes = await runKdf(
    new TextEncoder().encode(masterPassword),
    base64ToBuffer(saltBase64),
    kdf,
  )
  const masterKeyBytes = derivedBytes.slice(0, 32)
  const authKeyBytes = derivedBytes.slice(32, 64)

  const masterKey = await importAesKey(masterKeyBytes)
  // Hashed so the raw derived bytes never reach the server
  const authKey = bufferToHex(
    await window.crypto.subtle.digest('SHA-256', authKeyBytes),
  )

  // rawMasterKey is only needed for legacy vaults, where it is the vault key
  return { masterKey, rawMasterKey: masterKeyBytes, authKey }
}

/** 64 bytes from the master password, using the account's KDF. */
async function runKdf(
  password: Uint8Array,
  salt: Uint8Array,
  kdf: KdfParams,
): Promise<Uint8Array> {
  if (kdf.algorithm === 'argon2id') {
    // Loaded on demand: the WebAssembly module is only needed to unlock
    const { argon2id } = await import('hash-wasm')
    return argon2id({
      password,
      salt,
      iterations: kdf.iterations,
      memorySize: kdf.memoryKiB,
      parallelism: kdf.parallelism,
      hashLength: 64,
      outputType: 'binary',
    })
  }

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    password as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: kdf.iterations,
      hash: 'SHA-256',
    },
    baseKey,
    512,
  )
  return new Uint8Array(bits)
}

/** A non-extractable AES-256-GCM key from 32 raw bytes. */
export function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * A new random vault key. It encrypts every item and stays the same when the
 * master password changes; the password, recovery key and trusted devices
 * each hold their own wrapped copy of it.
 */
export function generateVaultKeyBytes(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(32))
}

/** Encrypts raw vault key bytes with a wrapping key. */
export function wrapKeyBytes(raw: Uint8Array, wrappingKey: CryptoKey) {
  return encryptData(bufferToBase64(raw), wrappingKey)
}

/** Decrypts vault key bytes wrapped by wrapKeyBytes. Throws on a wrong key. */
export async function unwrapKeyBytes(
  wrapped: string,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const raw = base64ToBuffer(await decryptData<string>(wrapped, wrappingKey))
  if (raw.length !== 32) throw new Error('Invalid vault key.')
  return raw
}

export interface EncryptedPayload {
  iv: string
  ciphertext: string
}

/**
 * Encrypts arbitrary serializable data using AES-256-GCM with a random 12-byte IV
 */
export async function encryptData(
  data: any,
  vaultKey: CryptoKey,
): Promise<string> {
  const encoder = new TextEncoder()
  const plaintext = encoder.encode(JSON.stringify(data))

  // 12-byte IV recommended for AES-GCM
  const iv = new Uint8Array(12)
  window.crypto.getRandomValues(iv)

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    vaultKey,
    plaintext,
  )

  const payload: EncryptedPayload = {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuffer),
  }

  return JSON.stringify(payload)
}

/**
 * Decrypts AES-256-GCM encrypted payload with the provided VaultKey
 */
export async function decryptData<T = any>(
  encryptedString: string,
  vaultKey: CryptoKey,
): Promise<T> {
  const payload: EncryptedPayload = JSON.parse(encryptedString)
  const iv = base64ToBuffer(payload.iv)
  const ciphertext = base64ToBuffer(payload.ciphertext)

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    vaultKey,
    ciphertext as any,
  )

  const decoder = new TextDecoder()
  const jsonString = decoder.decode(decryptedBuffer)
  return JSON.parse(jsonString) as T
}

/**
 * Password Generator options
 */
export interface PasswordGeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  avoidAmbiguous: boolean
}

export const DEFAULT_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: true,
}

/**
 * Cryptographically secure password generator
 */
export function generatePassword(
  options: Partial<PasswordGeneratorOptions> = {},
): string {
  const opts = { ...DEFAULT_GENERATOR_OPTIONS, ...options }
  let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let lowerChars = 'abcdefghijklmnopqrstuvwxyz'
  let numberChars = '0123456789'
  let symbolChars = '!@#$%^&*()-_=+[]{}|;:,.<>?'

  if (opts.avoidAmbiguous) {
    upperChars = upperChars.replace(/[IO]/g, '')
    lowerChars = lowerChars.replace(/[lo]/g, '')
    numberChars = numberChars.replace(/[01]/g, '')
    symbolChars = symbolChars.replace(/[|]/g, '')
  }

  const charSets: string[] = []
  if (opts.uppercase) charSets.push(upperChars)
  if (opts.lowercase) charSets.push(lowerChars)
  if (opts.numbers) charSets.push(numberChars)
  if (opts.symbols) charSets.push(symbolChars)

  if (charSets.length === 0) {
    charSets.push(lowerChars)
  }

  const allChars = charSets.join('')
  const passwordChars: string[] = []

  // Ensure at least one char from each chosen set
  for (const set of charSets) {
    const randomByte = new Uint32Array(1)
    window.crypto.getRandomValues(randomByte)
    passwordChars.push(set[randomByte[0] % set.length])
  }

  // Fill remaining length
  const remainingCount = Math.max(0, opts.length - passwordChars.length)
  const randomBytes = new Uint32Array(remainingCount)
  window.crypto.getRandomValues(randomBytes)

  for (let i = 0; i < remainingCount; i++) {
    passwordChars.push(allChars[randomBytes[i] % allChars.length])
  }

  // Shuffle with Fisher-Yates
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const randomByte = new Uint32Array(1)
    window.crypto.getRandomValues(randomByte)
    const j = randomByte[0] % (i + 1)
    const temp = passwordChars[i]
    passwordChars[i] = passwordChars[j]
    passwordChars[j] = temp
  }

  return passwordChars.join('')
}

/**
 * Password strength calculation (0 to 4 score)
 */
export function getPasswordStrength(password: string): {
  score: number // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  color: string
} {
  if (!password) return { score: 0, label: 'Very Weak', color: '#ef4444' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 14) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++

  const labels: Array<
    'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  > = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

  return {
    score,
    label: labels[score],
    color: colors[score],
  }
}

/**
 * RFC 6238 TOTP Code calculation
 */
export function getTOTPInfo(secret: string): {
  code: string | null
  secondsRemaining: number
  error?: string
} {
  try {
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase()
    if (!cleanSecret) {
      return { code: null, secondsRemaining: 30 }
    }

    const totp = new OTPAuth.TOTP({
      secret: cleanSecret,
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    })

    const code = totp.generate()
    const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30)

    return { code, secondsRemaining }
  } catch (err: any) {
    return {
      code: null,
      secondsRemaining: 30,
      error: 'Invalid TOTP secret',
    }
  }
}
