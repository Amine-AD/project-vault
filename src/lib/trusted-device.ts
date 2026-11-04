import { bufferToHex, unwrapKeyBytes, wrapKeyBytes } from './crypto'

/**
 * Trusted device
 *
 * Each browser where the vault is unlocked keeps, per account, two
 * non-extractable keys in IndexedDB: an AES-GCM key that wraps the vault
 * key, and an HMAC key that proves to the server this is the same browser.
 * The server stores only the wrapped vault key and a hash of the proof.
 *
 * Recovering on this browser needs both halves plus a verified email code:
 * the server alone can't unwrap the vault key, and the browser alone doesn't
 * have the wrapped copy. Clearing site data removes the trust.
 */

const DB_NAME = 'onevault-device'
const STORE = 'devices'
const PROOF_LABEL = 'onevault-device-proof-v1:'
const OPT_OUT_PREFIX = 'onevault_device_opt_out:'

interface DeviceRecord {
  email: string
  deviceId: string
  wrapKey: CryptoKey
  proofKey: CryptoKey
  createdAt: number
}

/** What the server needs to trust (or refresh) this browser. */
export interface DeviceEnrollment {
  id: string
  name: string
  authToken: string
  wrappedKey: string
}

/** What proves this browser is a trusted device. */
export interface DeviceProof {
  deviceId: string
  authToken: string
}

function normalize(email: string) {
  return email.trim().toLowerCase()
}

function isSupported() {
  return typeof indexedDB !== 'undefined' && !!globalThis.crypto?.subtle
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'email' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = run(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function getRecord(email: string): Promise<DeviceRecord | null> {
  if (!isSupported()) return null
  try {
    const record = await withStore<DeviceRecord | undefined>('readonly', (s) =>
      s.get(normalize(email)),
    )
    return record ?? null
  } catch (err) {
    console.error('[device] Could not read device key', err)
    return null
  }
}

async function createRecord(email: string): Promise<DeviceRecord> {
  const wrapKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // can't be exported, even by code running on this page
    ['encrypt', 'decrypt'],
  )
  const proofKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const record: DeviceRecord = {
    email: normalize(email),
    deviceId: crypto.randomUUID(),
    wrapKey,
    proofKey,
    createdAt: Date.now(),
  }
  await withStore('readwrite', (s) => s.put(record))
  return record
}

async function proofToken(record: DeviceRecord) {
  const signature = await crypto.subtle.sign(
    'HMAC',
    record.proofKey,
    new TextEncoder().encode(PROOF_LABEL + record.deviceId),
  )
  return bufferToHex(signature)
}

/** A short label like "Chrome on Windows", shown in the device list. */
export function describeThisDevice() {
  if (typeof navigator === 'undefined') return 'Unknown device'
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'unknown OS'
  return `${browser} on ${os}`
}

/** True if the user switched recovery off for this browser and account. */
export function isDeviceOptedOut(email: string) {
  try {
    return localStorage.getItem(OPT_OUT_PREFIX + normalize(email)) === '1'
  } catch {
    return false
  }
}

function setOptOut(email: string, optedOut: boolean) {
  try {
    if (optedOut) localStorage.setItem(OPT_OUT_PREFIX + normalize(email), '1')
    else localStorage.removeItem(OPT_OUT_PREFIX + normalize(email))
  } catch {
    // Storage blocked: the setting just won't stick
  }
}

/**
 * Call once the server has accepted a forced enrollment: the user chose to
 * trust this browser, so it re-trusts itself on unlock again.
 */
export function clearDeviceOptOut(email: string) {
  setOptOut(email, false)
}

/** This browser's device id for an account, if it has a device key. */
export async function getDeviceId(email: string) {
  return (await getRecord(email))?.deviceId ?? null
}

/**
 * Enrollment for this browser, creating its device key if needed. Null when
 * the user opted out, unless `force` (they chose to trust it), or when
 * the browser can't store keys. `created` lets a caller undo a key it made
 * for a sign-in that then failed.
 */
export async function prepareEnrollment(
  email: string,
  rawVaultKey: Uint8Array,
  { force = false } = {},
): Promise<{ enrollment: DeviceEnrollment; created: boolean } | null> {
  if (!isSupported()) return null
  if (!force && isDeviceOptedOut(email)) return null
  try {
    let record = await getRecord(email)
    const created = !record
    if (!record) record = await createRecord(email)
    return {
      created,
      enrollment: {
        id: record.deviceId,
        name: describeThisDevice(),
        authToken: await proofToken(record),
        wrappedKey: await wrapKeyBytes(rawVaultKey, record.wrapKey),
      },
    }
  } catch (err) {
    console.error('[device] Could not prepare device key', err)
    return null
  }
}

/** Proof that this browser is trusted for an account, or null if it isn't. */
export async function getDeviceProof(
  email: string,
): Promise<DeviceProof | null> {
  const record = await getRecord(email)
  if (!record) return null
  return { deviceId: record.deviceId, authToken: await proofToken(record) }
}

/** Unwraps the vault key bytes the server stored for this browser. */
export async function unwrapWithDevice(
  email: string,
  wrappedKey: string,
): Promise<Uint8Array> {
  const record = await getRecord(email)
  if (!record) throw new Error('This browser is no longer a trusted device.')
  return unwrapKeyBytes(wrappedKey, record.wrapKey)
}

/**
 * Deletes this browser's device key. With `optOut`, it also won't be trusted
 * again automatically the next time the vault is unlocked here.
 */
export async function forgetThisDevice(email: string, { optOut = false } = {}) {
  if (optOut) setOptOut(email, true)
  if (!isSupported()) return
  try {
    await withStore('readwrite', (s) => s.delete(normalize(email)))
  } catch (err) {
    console.error('[device] Could not delete device key', err)
  }
}
