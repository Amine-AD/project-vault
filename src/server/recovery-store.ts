import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '../db'
import {
  type LockedVault,
  type LockedVaultDevice,
  lockedVaults,
  trustedDevices,
  type User,
  type VaultItemRow,
  vaultItems,
} from '../db/schema'
import { verifySecret } from './guards'
import { isWrappedKey } from './validation'

/**
 * Server-only storage for the two ways back into a vault besides the master
 * password and recovery key: trusted devices, and vaults locked away by a
 * reset (instead of deleted).
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Db = typeof db | Tx

/** A browser asking to be trusted, as sent by src/lib/trusted-device.ts. */
export interface DeviceInput {
  id: string
  name: string
  authToken: string
  wrappedKey: string
}

function isDeviceInput(value: unknown): value is DeviceInput {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    /^[0-9a-f-]{36}$/i.test(d.id) &&
    typeof d.name === 'string' &&
    typeof d.authToken === 'string' &&
    /^[0-9a-f]{64}$/i.test(d.authToken) &&
    isWrappedKey(d.wrappedKey)
  )
}

/**
 * Trusts a browser for `userId`, or refreshes it (a new vault key after a
 * password change, or just its last-used time). Ignores bad input and ids
 * that belong to another account. Only call after the caller has proven
 * they can open the vault.
 */
export function saveDevice(tx: Db, userId: string, device: unknown) {
  if (!isDeviceInput(device)) return
  const now = Date.now()
  const name = device.name.trim().slice(0, 80) || 'Unknown device'
  const authHash = bcrypt.hashSync(device.authToken, 10)
  const existing = tx
    .select({ userId: trustedDevices.userId })
    .from(trustedDevices)
    .where(eq(trustedDevices.id, device.id))
    .get()

  if (existing && existing.userId !== userId) return
  if (existing) {
    tx.update(trustedDevices)
      .set({ name, authHash, wrappedKey: device.wrappedKey, lastUsedAt: now })
      .where(eq(trustedDevices.id, device.id))
      .run()
  } else {
    tx.insert(trustedDevices)
      .values({
        id: device.id,
        userId,
        name,
        authHash,
        wrappedKey: device.wrappedKey,
        createdAt: now,
        lastUsedAt: now,
      })
      .run()
  }
}

/**
 * Removes trusted devices, e.g. after the vault key changed and their
 * wrapped copies went stale. They're trusted again the next time the vault
 * is unlocked on them.
 */
export function deleteDevices(tx: Db, userId: string, exceptId?: string) {
  tx.delete(trustedDevices)
    .where(
      exceptId
        ? and(
            eq(trustedDevices.userId, userId),
            ne(trustedDevices.id, exceptId),
          )
        : eq(trustedDevices.userId, userId),
    )
    .run()
}

/** The id of a device input, if it's valid (to keep it while others go). */
export function deviceId(device: unknown) {
  return isDeviceInput(device) ? device.id : undefined
}

export interface DeviceProofInput {
  deviceId: string
  authToken: string
}

/**
 * Checks that the caller is a trusted device of `user` and returns its
 * wrapped vault key. Failures count toward a per-email lockout.
 */
export function checkDeviceProof(
  email: string,
  user: User | undefined,
  proof: DeviceProofInput,
): { ok: true; wrappedKey: string } | { ok: false; error: string | null } {
  const device = user
    ? db
        .select()
        .from(trustedDevices)
        .where(
          and(
            eq(trustedDevices.id, String(proof?.deviceId ?? '')),
            eq(trustedDevices.userId, user.id),
          ),
        )
        .get()
    : undefined
  const check = verifySecret(
    `device:${email}`,
    proof?.authToken,
    device?.authHash,
  )
  if (!check.ok || !device) {
    return { ok: false, error: check.ok ? null : check.error }
  }
  return { ok: true, wrappedKey: device.wrappedKey }
}

/**
 * Sets the user's current vault aside instead of deleting it: its items,
 * the hashes that let the old password, recovery key or trusted devices
 * open it, and their wrapped keys. Then empties the live vault. Skipped if
 * the vault has no items.
 */
export function lockAwayVault(tx: Tx, user: User) {
  const rows = tx
    .select()
    .from(vaultItems)
    .where(eq(vaultItems.userId, user.id))
    .all()

  if (rows.length > 0) {
    const devices: LockedVaultDevice[] = tx
      .select()
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, user.id))
      .all()
      .map((d) => ({
        id: d.id,
        authHash: d.authHash,
        wrappedKey: d.wrappedKey,
      }))

    tx.insert(lockedVaults)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        salt: user.salt,
        kdfAlgorithm: user.kdfAlgorithm,
        kdfIterations: user.kdfIterations,
        kdfMemoryKiB: user.kdfMemoryKiB,
        kdfParallelism: user.kdfParallelism,
        authHash: user.authHash,
        encryptedVaultKey: user.encryptedVaultKey,
        recoveryAuthHash: user.recoveryAuthHash,
        recoveryWrappedKey: user.recoveryWrappedKey,
        devices: JSON.stringify(devices),
        items: JSON.stringify(rows),
        itemCount: rows.length,
        lockedAt: Date.now(),
      })
      .run()
  }

  tx.delete(vaultItems).where(eq(vaultItems.userId, user.id)).run()
  deleteDevices(tx, user.id)
  return rows.length
}

export function lockedVaultDevices(vault: LockedVault): LockedVaultDevice[] {
  try {
    return JSON.parse(vault.devices) as LockedVaultDevice[]
  } catch {
    return []
  }
}

export function lockedVaultItems(vault: LockedVault): VaultItemRow[] {
  return JSON.parse(vault.items) as VaultItemRow[]
}

/** Ways to prove you can open a locked vault. */
export type LockedVaultProof =
  | { kind: 'password'; authKey: string }
  | { kind: 'recoveryKey'; authKey: string }
  | { kind: 'device'; deviceId: string; authToken: string }

/**
 * Checks a proof against a locked vault. Returns the vault key wrapped for
 * that proof: by the recovery key, the device, or the master key derived
 * from the old password (null for a vault made before the random vault key,
 * whose items the old master key opens directly). Failures count toward a
 * per-vault lockout.
 */
export function checkLockedVaultProof(
  vault: LockedVault,
  proof: LockedVaultProof,
): { ok: true; wrappedKey: string | null } | { ok: false; error: string } {
  const account = `locked:${vault.id}`
  const fail = (error: string | null) => ({
    ok: false as const,
    error: error ?? WRONG_PROOF[proof?.kind] ?? 'That didn’t work.',
  })

  switch (proof?.kind) {
    case 'password': {
      const check = verifySecret(account, proof.authKey, vault.authHash)
      return check.ok
        ? { ok: true, wrappedKey: vault.encryptedVaultKey }
        : fail(check.error)
    }
    case 'recoveryKey': {
      const check = verifySecret(account, proof.authKey, vault.recoveryAuthHash)
      if (!check.ok || !vault.recoveryWrappedKey) {
        return fail(check.ok ? null : check.error)
      }
      return { ok: true, wrappedKey: vault.recoveryWrappedKey }
    }
    case 'device': {
      const device = lockedVaultDevices(vault).find(
        (d) => d.id === proof.deviceId,
      )
      const check = verifySecret(account, proof.authToken, device?.authHash)
      if (!check.ok || !device) return fail(check.ok ? null : check.error)
      return { ok: true, wrappedKey: device.wrappedKey }
    }
    default:
      return fail('Invalid request.')
  }
}

const WRONG_PROOF: Record<LockedVaultProof['kind'], string> = {
  password: 'That isn’t the master password this vault had.',
  recoveryKey: 'That isn’t the recovery key for this vault.',
  device: 'This browser wasn’t trusted for this vault.',
}
