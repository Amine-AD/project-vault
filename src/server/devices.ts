import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { trustedDevices } from '../db/schema'
import { requireSessionUser, verifySecret } from './guards'
import { type DeviceInput, deviceId, saveDevice } from './recovery-store'
import { INVALID_REQUEST } from './validation'

/** The signed-in user's trusted devices, most recently used first. */
export const listTrustedDevices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = requireSessionUser()
    return db
      .select({
        id: trustedDevices.id,
        name: trustedDevices.name,
        createdAt: trustedDevices.createdAt,
        lastUsedAt: trustedDevices.lastUsedAt,
      })
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, user.id))
      .orderBy(desc(trustedDevices.lastUsedAt))
      .all()
  },
)

/** Stops a device from being able to recover the vault. */
export const removeTrustedDevice = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()
    db.delete(trustedDevices)
      .where(
        and(
          eq(trustedDevices.id, String(data.id ?? '')),
          eq(trustedDevices.userId, user.id),
        ),
      )
      .run()
    return { success: true }
  })

/**
 * Trusts this browser, or refreshes its wrapped key: after signing in, and
 * when the user turns trust back on. Needs the master password (as its
 * authKey), so a session alone can't add a device.
 */
export const trustThisDevice = createServerFn({ method: 'POST' })
  .validator((data: { authKey: string; device: DeviceInput }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()
    if (!deviceId(data.device)) {
      return { success: false, error: INVALID_REQUEST }
    }
    const check = verifySecret(user.email, data.authKey, user.authHash)
    if (!check.ok) {
      return {
        success: false,
        error: check.error ?? 'Master password is incorrect.',
      }
    }
    saveDevice(db, user.id, data.device)
    return { success: true }
  })
