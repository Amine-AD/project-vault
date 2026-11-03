import {
  base64ToBuffer,
  bufferToBase64,
  bufferToHex,
  decryptData,
  encryptData,
} from './crypto'

/**
 * Recovery kit
 *
 * A recovery key is 160 random bits, shown once as "OV-XXXX-…" (Crockford
 * base32, so 0/O and 1/I/L can't be confused). HKDF splits it into:
 *  - an AES-GCM key that wraps the vault key; the wrapped copy is stored on
 *    the server, useless without the recovery key;
 *  - an auth token the server bcrypt-hashes, proving the caller holds the
 *    key before it hands over the wrapped vault key or allows a reset.
 *
 * The server never sees the recovery key or the vault key. If both the
 * master password and the recovery key are lost, the vault is unrecoverable.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const KEY_BYTES = 20
const KEY_CHARS = 32 // 160 bits / 5 bits per char
const PREFIX = 'OV'
const HKDF_SALT = new TextEncoder().encode('onevault-recovery-v1')
const HKDF_INFO = new TextEncoder().encode('onevault recovery key')

function encodeBase32(bytes: Uint8Array) {
  let out = ''
  let value = 0
  let bits = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += ALPHABET[(value >>> bits) & 31]
    }
    value &= (1 << bits) - 1
  }
  return out
}

function decodeBase32(text: string): Uint8Array | null {
  const out: number[] = []
  let value = 0
  let bits = 0
  for (const char of text) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) return null
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 255)
    }
    value &= (1 << bits) - 1
  }
  return new Uint8Array(out)
}

/** "OV-ABCD-EFGH-…": eight groups of four after the prefix. */
function formatRecoveryKey(chars: string) {
  return [PREFIX, ...(chars.match(/.{4}/g) ?? [])].join('-')
}

/**
 * Parses what the user typed or pasted. Forgiving about case, spaces,
 * dashes, the OV prefix and look-alike characters. Null if it isn't a key.
 */
export function parseRecoveryKey(input: string): Uint8Array | null {
  let chars = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (chars.length === KEY_CHARS + PREFIX.length && chars.startsWith(PREFIX)) {
    chars = chars.slice(PREFIX.length)
  }
  chars = chars.replace(/O/g, '0').replace(/[IL]/g, '1')
  if (chars.length !== KEY_CHARS) return null
  const bytes = decodeBase32(chars)
  return bytes?.length === KEY_BYTES ? bytes : null
}

async function deriveRecoveryKeys(keyBytes: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    'HKDF',
    false,
    ['deriveBits'],
  )
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: HKDF_INFO },
      material,
      512,
    ),
  )
  const wrappingKey = await crypto.subtle.importKey(
    'raw',
    bits.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
  const authKey = bufferToHex(
    await crypto.subtle.digest('SHA-256', bits.slice(32, 64)),
  )
  return { wrappingKey, authKey }
}

/** What the server stores for a recovery kit. */
export interface RecoveryMaterial {
  /** Proves the caller holds the recovery key (bcrypt-hashed server side). */
  authKey: string
  /** The vault key, encrypted with the recovery key. */
  wrappedKey: string
}

/**
 * Creates a fresh recovery key for a vault key. Returns the key to show the
 * user (once) and the material to send to the server.
 */
export async function createRecoveryKit(rawVaultKey: Uint8Array): Promise<{
  recoveryKey: string
  material: RecoveryMaterial
}> {
  const keyBytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES))
  const { wrappingKey, authKey } = await deriveRecoveryKeys(keyBytes)
  const wrappedKey = await encryptData(bufferToBase64(rawVaultKey), wrappingKey)
  return {
    recoveryKey: formatRecoveryKey(encodeBase32(keyBytes)),
    material: { authKey, wrappedKey },
  }
}

/** The auth token for a parsed recovery key (step one of a recovery). */
export async function recoveryAuthKey(keyBytes: Uint8Array) {
  return (await deriveRecoveryKeys(keyBytes)).authKey
}

/** Unwraps the stored vault key with the recovery key. */
export async function unwrapVaultKey(
  wrappedKey: string,
  keyBytes: Uint8Array,
): Promise<CryptoKey> {
  const { wrappingKey } = await deriveRecoveryKeys(keyBytes)
  const raw = base64ToBuffer(await decryptData<string>(wrappedKey, wrappingKey))
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}
