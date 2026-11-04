import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { trustedDevices } from '../db/schema'
import { requireSessionUser, verifySecret } from './guards'
import { type DeviceInput, saveDevice } from './recovery-store'

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
 * Trusts this browser again after the user turned it off. Needs the master
 * password, since the browser has to wrap the vault key derived from it.
 */
export const trustThisDevice = createServerFn({ method: 'POST' })
  .validator((data: { authKey: string; device: DeviceInput }) => data)
  .handler(async ({ data }) => {
    const user = requireSessionUser()
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
