import * as OTPAuth from 'otpauth'

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
 * Derives both:
 * 1. VaultKey: AES-256-GCM CryptoKey (kept strictly in browser memory)
 * 2. AuthKey: SHA-256 hashed token sent to the server for authentication
 */
export async function deriveKeys(
  masterPassword: string,
  saltBase64: string,
  iterations = 600000
): Promise<{ vaultKey: CryptoKey; authKey: string }> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(masterPassword)
  const saltBuffer = base64ToBuffer(saltBase64)

  // Import raw password as key material for PBKDF2
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  )

  // Derive 512 bits (64 bytes)
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    512
  )

  const derivedBytes = new Uint8Array(derivedBits)
  // First 256 bits (32 bytes) = Vault Encryption Key
  const vaultKeyBytes = derivedBytes.slice(0, 32)
  // Second 256 bits (32 bytes) = Auth Key material
  const authKeyBytes = derivedBytes.slice(32, 64)

  // Import Vault Key as AES-GCM
  const vaultKey = await window.crypto.subtle.importKey(
    'raw',
    vaultKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )

  // Hash authKeyBytes with SHA-256 before sending to server to prevent raw derived key leakage
  const authHashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    authKeyBytes
  )
  const authKey = bufferToHex(authHashBuffer)

  return { vaultKey, authKey }
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
  vaultKey: CryptoKey
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
    plaintext
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
  vaultKey: CryptoKey
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
    ciphertext as any
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
  options: Partial<PasswordGeneratorOptions> = {}
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

  const labels: Array<'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'> = [
    'Very Weak',
    'Weak',
    'Fair',
    'Strong',
    'Very Strong',
  ]
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
