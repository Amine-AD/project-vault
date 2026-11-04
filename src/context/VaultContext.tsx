import type React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from '../components/ui/toast'
import {
  decryptData,
  deriveMasterKey,
  encryptData,
  generateSalt,
  generateVaultKeyBytes,
  importAesKey,
  unwrapKeyBytes,
  wrapKeyBytes,
} from '../lib/crypto'
import { DEFAULT_KDF, isOutdatedKdf, type KdfParams } from '../lib/kdf'
import {
  createRecoveryKit as createRecoveryKitMaterial,
  parseRecoveryKey,
  recoveryAuthKey,
  unwrapVaultKey,
} from '../lib/recovery'
import {
  clearDeviceOptOut,
  forgetThisDevice,
  getDeviceId,
  getDeviceProof,
  prepareEnrollment,
  unwrapWithDevice,
} from '../lib/trusted-device'
import {
  changeMasterPassword,
  completeRecovery,
  deleteAccount as deleteAccountOnServer,
  getCurrentUser,
  getKeyMaterial,
  getPreloginData,
  getRecoveryStatus,
  loginUser,
  logoutUser,
  registerUser,
  resetAccount as resetAccountOnServer,
  setRecoveryKit,
  startRecovery,
} from '../server/auth'
import {
  removeTrustedDevice,
  trustThisDevice as trustThisDeviceOnServer,
} from '../server/devices'
import type { ClientVaultRow } from '../server/item-rows'
import {
  deleteLockedVault as deleteLockedVaultOnServer,
  openLockedVault,
  restoreLockedVault as restoreLockedVaultOnServer,
} from '../server/locked-vaults'
import {
  batchImportVaultItems,
  deleteAllVaultItems,
  deleteVaultItem,
  getEncryptedVaultItems,
  saveVaultItem,
} from '../server/vault'
import type {
  DecryptedItem,
  ItemType,
  LoginItem,
  UserSession,
} from '../types/vault'

interface VaultContextType {
  user: UserSession | null
  isUnlocked: boolean
  isLoading: boolean
  items: DecryptedItem[]
  filteredItems: DecryptedItem[]
  selectedItem: DecryptedItem | null
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  selectedTag: string | null
  setSelectedTag: (tag: string | null) => void
  allTags: string[]
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  isCreating: boolean
  setIsCreating: (creating: boolean) => void
  createType: ItemType
  setCreateType: (type: ItemType) => void
  autoLockMinutes: number
  setAutoLockMinutes: (minutes: number) => void
  clipboardClearSeconds: number
  setClipboardClearSeconds: (seconds: number) => void
  // Auth & Vault Actions
  /**
   * `trustDevice` (default true) lets this browser recover the vault later;
   * false also forgets it if it was trusted before. The same option applies
   * to registering, recovering and resetting.
   */
  handleLogin: (
    email: string,
    masterPass: string,
    options?: TrustOptions,
  ) => Promise<void>
  /** `ticket` comes from a verified sign-up email code. */
  handleRegister: (
    email: string,
    ticket: string,
    masterPass: string,
    options?: TrustOptions,
  ) => Promise<void>
  handleUnlock: (masterPass: string) => Promise<void>
  lockVault: () => void
  handleLogout: () => Promise<void>
  saveItem: (item: Partial<DecryptedItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  importBatch: (newItems: Partial<DecryptedItem>[]) => Promise<number>
  exportDecryptedJSON: () => string
  refreshItems: () => Promise<void>
  copySecureText: (text: string) => Promise<void>
  updateMasterPassword: (currentPass: string, newPass: string) => Promise<void>
  /** Deletes every item. Needs the master password. */
  eraseAllItems: (masterPass: string) => Promise<void>
  // Recovery kit
  /** When the kit was made; null if there is none, undefined while loading. */
  recoveryCreatedAt: number | null | undefined
  /** A freshly made recovery key the user still has to save, if any. */
  pendingRecoveryKey: string | null
  dismissRecoveryKey: () => void
  createRecoveryKit: (masterPass: string) => Promise<void>
  /**
   * Forgotten master password, with the recovery key or this browser as a
   * trusted device. `ticket` comes from a verified recovery email code.
   */
  recoverVault: (
    email: string,
    ticket: string,
    method: RecoveryMethod,
    newMasterPass: string,
    options?: TrustOptions,
  ) => Promise<void>
  /**
   * No recovery key or trusted device: starts a new, empty vault. The old
   * items are locked away, not deleted. Resolves to how many were locked.
   */
  resetVault: (
    email: string,
    ticket: string,
    newMasterPass: string,
    options?: TrustOptions,
  ) => Promise<number>
  /** Opens a locked vault and moves its items back. Resolves to the count. */
  restoreLockedVault: (
    vault: LockedVaultInfo,
    method: LockedVaultMethod,
  ) => Promise<number>
  /** Deletes a locked vault for good. Needs the current master password. */
  deleteLockedVault: (vaultId: string, masterPass: string) => Promise<void>
  /** Trusts this browser for recovery again (after turning it off). */
  trustThisDevice: (masterPass: string) => Promise<void>
  /**
   * Permanently deletes the account and everything in it, then signs out.
   * `beforeSignOut` runs once the server has deleted it but before local
   * state is cleared, e.g. to navigate away from the app first (otherwise
   * the app would redirect to sign-in).
   */
  deleteAccount: (
    masterPass: string,
    beforeSignOut?: () => Promise<void>,
  ) => Promise<void>
}

export type RecoveryMethod =
  | { kind: 'recoveryKey'; recoveryKey: string }
  | { kind: 'device' }

export type LockedVaultMethod =
  | { kind: 'password'; password: string }
  | RecoveryMethod

/** What the browser needs to know about a locked vault to open it. */
export interface LockedVaultInfo {
  id: string
  salt: string
  kdf: KdfParams
}

export interface TrustOptions {
  /** Trust this browser for recovery. Defaults to true. */
  trustDevice?: boolean
}

/**
 * Device enrollment for an explicit "Trust this device" choice: set up (and
 * re-enabled if it was turned off) when trusted, none when not.
 */
async function chosenEnrollment(
  email: string,
  rawVaultKey: Uint8Array,
  { trustDevice = true }: TrustOptions = {},
) {
  return trustDevice
    ? prepareEnrollment(email, rawVaultKey, { force: true })
    : null
}

/**
 * Once signed in, applies the "Trust this device" choice. Trusted: it keeps
 * re-trusting itself on unlock. Not trusted: drop this browser's key, stop
 * it re-trusting itself, and with `removeOnServer` also remove its server
 * record (for sign-ins that don't already drop other devices).
 */
async function applyTrustChoice(
  email: string,
  { trustDevice = true }: TrustOptions,
  { removeOnServer }: { removeOnServer: boolean },
) {
  if (trustDevice) {
    clearDeviceOptOut(email)
    return
  }
  const deviceId = removeOnServer ? await getDeviceId(email) : null
  await forgetThisDevice(email, { optOut: true })
  if (deviceId) {
    await removeTrustedDevice({ data: { id: deviceId } }).catch((err) =>
      console.error('Failed to remove trusted device', err),
    )
  }
}

const NOT_A_RECOVERY_KEY =
  'That doesn’t look like a recovery key. It starts with OV- and has 32 letters and numbers after it.'

/** Parses a typed recovery key into its bytes and server auth token. */
async function readRecoveryKey(input: string) {
  const keyBytes = parseRecoveryKey(input)
  if (!keyBytes) throw new Error(NOT_A_RECOVERY_KEY)
  return { keyBytes, authKey: await recoveryAuthKey(keyBytes) }
}

const VaultContext = createContext<VaultContextType | null>(null)

/** How long the "deleted, undo?" toast stays up (it pauses while hovered). */
const UNDO_DELETE_MS = 8000
/** Safety net in case the toast never closes (e.g. it's stuck in a queue). */
const DELETE_FALLBACK_MS = 60_000

/**
 * Everything about an item that gets encrypted: all user content plus its
 * type, favorite flag and tags. Only the id and timestamps stay readable by
 * the server.
 */
function toEncryptedPayload(
  item: Partial<DecryptedItem>,
  fallbackTitle: string,
) {
  const type = item.type || 'login'
  const login = item as Partial<LoginItem>
  return {
    type,
    isFavorite: item.isFavorite ?? false,
    title: item.title || fallbackTitle,
    notes: item.notes || '',
    customFields: item.customFields || [],
    tags: item.tags || [],
    ...(type === 'login'
      ? {
          username: login.username || '',
          password: login.password || '',
          url: login.url || '',
          totpSecret: login.totpSecret || '',
        }
      : {}),
  }
}

/**
 * Decrypts server rows. With `strict`, any row that fails to decrypt throws
 * (used where skipping one would lose it, like restoring locked items);
 * otherwise it's skipped and counted in `failed`.
 */
async function decryptRows(
  rows: ClientVaultRow[],
  key: CryptoKey,
  { strict = false } = {},
) {
  const items: DecryptedItem[] = []
  let failed = 0

  for (const row of rows) {
    try {
      const payload = await decryptData<Partial<DecryptedItem>>(
        row.encryptedData,
        key,
      )
      items.push({
        ...payload,
        id: row.id,
        type: payload.type ?? 'login',
        isFavorite: payload.isFavorite ?? false,
        tags: payload.tags ?? [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as DecryptedItem)
    } catch (err) {
      if (strict) throw new Error('Some items could not be decrypted.')
      console.error(`Failed to decrypt item ${row.id}`, err)
      failed += 1
    }
  }

  return { items, failed }
}

/** A vault key: its raw bytes (to wrap it) and the AES key that uses them. */
interface OpenedKey {
  raw: Uint8Array
  key: CryptoKey
}

async function openKey(raw: Uint8Array): Promise<OpenedKey> {
  return { raw, key: await importAesKey(raw) }
}

type Enrollment = Awaited<ReturnType<typeof prepareEnrollment>>
/** Makes this browser's device enrollment for a vault key, if it should. */
type Enroll = (rawVaultKey: Uint8Array) => Promise<Enrollment>

/**
 * What the server stores for a master password: a fresh salt, the current
 * KDF settings, the auth key, and the vault key wrapped with the master key.
 */
async function passwordKeys(masterPass: string, rawVaultKey: Uint8Array) {
  const salt = generateSalt()
  const kdf = DEFAULT_KDF
  const { masterKey, authKey } = await deriveMasterKey(masterPass, salt, kdf)
  return {
    salt,
    kdf,
    authKey,
    encryptedVaultKey: await wrapKeyBytes(rawVaultKey, masterKey),
  }
}

/** Encrypts decrypted items with a vault key, for a bulk update. */
function encryptItems(items: DecryptedItem[], key: CryptoKey) {
  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      encryptedData: await encryptData(
        toEncryptedPayload(item, item.title),
        key,
      ),
    })),
  )
}

/**
 * Re-checks the master password of the signed-in account in the browser and
 * opens the vault key with it. Used where the vault key has to be wrapped
 * again (new recovery kit, trusting this browser, new password) or the
 * password must be confirmed (erasing data).
 */
async function unlockWithPassword(
  masterPass: string,
  wrongMessage = 'Master password is incorrect.',
) {
  const material = await getKeyMaterial()
  const derived = await deriveMasterKey(masterPass, material.salt, material.kdf)
  let raw: Uint8Array
  try {
    raw = await unwrapKeyBytes(material.encryptedVaultKey, derived.masterKey)
  } catch {
    throw new Error(wrongMessage)
  }
  return { authKey: derived.authKey, raw }
}

/** Checks the master password with the server and opens the vault key. */
async function signIn(email: string, masterPass: string) {
  const prelogin = await getPreloginData({ data: { email } })
  const derived = await deriveMasterKey(masterPass, prelogin.salt, prelogin.kdf)
  const result = await loginUser({ data: { email, authKey: derived.authKey } })
  if (!result.success) {
    throw new Error(result.error || 'Invalid email or master password.')
  }
  const raw = await unwrapKeyBytes(result.encryptedVaultKey, derived.masterKey)
  return {
    user: result.user,
    authKey: derived.authKey,
    kdf: prelogin.kdf as KdfParams,
    opened: await openKey(raw),
  }
}

/**
 * If the vault's KDF settings are weaker than the current defaults (they're
 * raised in a later version), wraps the vault key again under the current
 * ones, right after the master password was checked. Nothing else changes.
 * Never blocks unlocking: on any error the vault stays as it was. Resolves
 * to the auth key now valid for the password.
 */
async function upgradeKdfIfNeeded(
  masterPass: string,
  session: Awaited<ReturnType<typeof signIn>>,
): Promise<string> {
  if (!isOutdatedKdf(session.kdf)) return session.authKey
  try {
    const keys = await passwordKeys(masterPass, session.opened.raw)
    const res = await changeMasterPassword({
      data: { oldAuthKey: session.authKey, keys, reason: 'upgrade' },
    })
    if (!res.success) throw new Error(res.error)
    return keys.authKey
  } catch (err) {
    console.error('[vault] KDF upgrade skipped; will retry on next unlock', err)
    return session.authKey
  }
}

/**
 * Trusts this browser (or refreshes its wrapped key) after sign-in. Never
 * blocks unlocking: if it fails, the browser just isn't trusted this time.
 */
async function enrollDevice(
  email: string,
  authKey: string,
  rawVaultKey: Uint8Array,
  enroll: Enroll,
) {
  const device = await enroll(rawVaultKey)
  if (!device) return
  const res = await trustThisDeviceOnServer({
    data: { authKey, device: device.enrollment },
  }).catch((err) => {
    console.error('[device] Could not trust this browser', err)
    return null
  })
  if (!res?.success && device.created) await forgetThisDevice(email)
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)
  const [items, setItems] = useState<DecryptedItem[]>([])

  // UI Navigation & Filters
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createType, setCreateType] = useState<ItemType>('login')

  // Recovery kit
  const [recoveryCreatedAt, setRecoveryCreatedAt] = useState<
    number | null | undefined
  >(undefined)
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(
    null,
  )

  // Auto-Lock Settings
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault_autolock_minutes')
      return saved ? parseInt(saved, 10) : 15
    }
    return 15
  })

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes)
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_autolock_minutes', minutes.toString())
    }
  }

  // Clipboard Auto-Clear Settings
  const [clipboardClearSeconds, setClipboardClearSecondsState] =
    useState<number>(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('vault_clipboard_clear_seconds')
        return saved ? parseInt(saved, 10) : 30
      }
      return 30
    })

  const setClipboardClearSeconds = (seconds: number) => {
    setClipboardClearSecondsState(seconds)
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_clipboard_clear_seconds', seconds.toString())
    }
  }

  const copySecureText = async (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
    if (clipboardClearSeconds > 0) {
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText()
          if (current === text) {
            await navigator.clipboard.writeText('')
          }
        } catch {
          // Ignore if clipboard read permission is blocked
        }
      }, clipboardClearSeconds * 1000)
    }
  }

  // Ref to track user activity timestamp
  const lastActivityRef = useRef<number>(Date.now())

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Lock vault helper (clears vaultKey and items from memory immediately)
  const lockVault = useCallback(() => {
    setVaultKey(null)
    setItems([])
    setIsUnlocked(false)
    setSelectedId(null)
    setIsEditing(false)
    setIsCreating(false)
  }, [])

  // Activity listeners for Auto-Lock
  useEffect(() => {
    if (!isUnlocked) return

    const handleUserInteraction = () => updateActivity()

    window.addEventListener('mousemove', handleUserInteraction)
    window.addEventListener('keydown', handleUserInteraction)
    window.addEventListener('click', handleUserInteraction)
    window.addEventListener('scroll', handleUserInteraction)

    const interval = setInterval(() => {
      if (autoLockMinutes <= 0) return // 0 = never
      const idleTimeMs = Date.now() - lastActivityRef.current
      if (idleTimeMs >= autoLockMinutes * 60 * 1000) {
        lockVault()
      }
    }, 5000)

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction)
      window.removeEventListener('keydown', handleUserInteraction)
      window.removeEventListener('click', handleUserInteraction)
      window.removeEventListener('scroll', handleUserInteraction)
      clearInterval(interval)
    }
  }, [isUnlocked, autoLockMinutes, lockVault, updateActivity])

  // Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        setIsLoading(true)
        const res = await getCurrentUser()
        if (res && res.user) {
          setUser(res.user)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Session check failed', err)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  // Fetch and decrypt items using provided key
  const fetchAndDecryptItems = useCallback(
    async (key: CryptoKey) => {
      let rows: ClientVaultRow[]
      try {
        rows = await getEncryptedVaultItems()
      } catch (err) {
        // Without this the vault would just look empty, as if items were lost
        console.error('Failed to load items', err)
        toast.error({
          title: 'Couldn’t load your items',
          description:
            'Nothing was deleted. Check your connection and reload the page.',
          duration: 15_000,
        })
        return
      }
      try {
        const { items: decrypted, failed } = await decryptRows(rows, key)
        setItems(decrypted)
        if (failed > 0) {
          toast.warning({
            title:
              failed === 1
                ? '1 item couldn’t be opened'
                : `${failed} items couldn’t be opened`,
            description:
              'They’re still stored on the server, but hidden here because they can’t be decrypted. Don’t erase your vault.',
            duration: 20_000,
          })
        }

        if (decrypted.length > 0 && !selectedId) {
          setSelectedId(decrypted[0].id)
        }
      } catch (err) {
        console.error('Failed to load items', err)
      }
    },
    [selectedId],
  )

  const refreshItems = useCallback(async () => {
    if (vaultKey) {
      await fetchAndDecryptItems(vaultKey)
    }
  }, [vaultKey, fetchAndDecryptItems])

  // Sign in (or unlock): check the master password, open the vault key,
  // bring its KDF settings up to date if needed and trust this browser.
  const openSession = async (
    email: string,
    masterPass: string,
    enroll: Enroll,
  ) => {
    const session = await signIn(email, masterPass)
    const authKey = await upgradeKdfIfNeeded(masterPass, session)
    await enrollDevice(email, authKey, session.opened.raw, enroll)

    setUser(session.user)
    setVaultKey(session.opened.key)
    setIsUnlocked(true)
    await fetchAndDecryptItems(session.opened.key)
  }

  // Login & Unlock
  const handleLogin = async (
    email: string,
    masterPass: string,
    trust: TrustOptions = {},
  ) => {
    // Unknown emails get a stand-in salt and fail at loginUser with the same
    // error as a wrong password, so sign-in can't reveal who has a vault.
    await openSession(email, masterPass, (raw) =>
      chosenEnrollment(email, raw, trust),
    )
    await applyTrustChoice(email, trust, { removeOnServer: true })
  }

  // Register & Unlock
  const handleRegister = async (
    email: string,
    ticket: string,
    masterPass: string,
    trust: TrustOptions = {},
  ) => {
    const opened = await openKey(generateVaultKeyBytes())
    const keys = await passwordKeys(masterPass, opened.raw)
    const kit = await createRecoveryKitMaterial(opened.raw)
    const device = await chosenEnrollment(email, opened.raw, trust)

    const result = await registerUser({
      data: {
        email,
        ticket,
        keys,
        recovery: kit.material,
        device: device?.enrollment,
      },
    })

    if (!result.success || !result.user) {
      if (device?.created) await forgetThisDevice(email)
      throw new Error(result.error || 'Failed to create account.')
    }
    // A brand-new account has no other device records to remove
    await applyTrustChoice(email, trust, { removeOnServer: false })

    setUser(result.user)
    setVaultKey(opened.key)
    setIsUnlocked(true)
    setItems([])
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
  }

  // Unlock when session is already active
  const handleUnlock = async (masterPass: string) => {
    if (!user) throw new Error('No user session active')
    const email = user.email
    await openSession(email, masterPass, (raw) => prepareEnrollment(email, raw))
  }

  // Logout
  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await flushPendingDeletes()
      await logoutUser()
      lockVault()
      setUser(null)
      setRecoveryCreatedAt(undefined)
      setPendingRecoveryKey(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Save Item (Create or Update)
  const saveItem = async (itemData: Partial<DecryptedItem>) => {
    if (!vaultKey) throw new Error('Vault is locked')

    const id = itemData.id || crypto.randomUUID()
    const type = itemData.type || 'login'
    const isFavorite = itemData.isFavorite ?? false
    const now = Date.now()

    const payloadToEncrypt = toEncryptedPayload(
      { ...itemData, type, isFavorite },
      'Untitled',
    )
    const encryptedData = await encryptData(payloadToEncrypt, vaultKey)

    await saveVaultItem({ data: { id, encryptedData } })

    const updatedItem = {
      ...payloadToEncrypt,
      id,
      createdAt: itemData.createdAt || now,
      updatedAt: now,
    } as DecryptedItem

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updatedItem
        return next
      }
      return [updatedItem, ...prev]
    })

    setSelectedId(id)
    setIsEditing(false)
    setIsCreating(false)
  }

  // Remove Item: hidden at once and deleted on the server when its undo toast
  // closes without Undo. Logging out or leaving the page deletes it right away.
  const pendingDeletes = useRef(
    new Map<
      string,
      { item: DecryptedItem; timer: ReturnType<typeof setTimeout> }
    >(),
  )

  const commitDelete = useCallback(async (id: string) => {
    const pending = pendingDeletes.current.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeletes.current.delete(id)
    try {
      await deleteVaultItem({ data: { id } })
    } catch (err) {
      console.error('Failed to delete item', err)
      setItems((prev) => [pending.item, ...prev])
      toast.error({
        title: `Couldn't delete "${pending.item.title}"`,
        description: 'It has been restored. Try again.',
      })
    }
  }, [])

  const flushPendingDeletes = useCallback(async () => {
    await Promise.all([...pendingDeletes.current.keys()].map(commitDelete))
  }, [commitDelete])

  useEffect(() => {
    const onPageHide = () => {
      flushPendingDeletes()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [flushPendingDeletes])

  const undoDelete = (id: string) => {
    const pending = pendingDeletes.current.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeletes.current.delete(id)
    setItems((prev) =>
      [pending.item, ...prev].sort((a, b) => b.updatedAt - a.updatedAt),
    )
    setSelectedId(id)
  }

  const removeItem = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    setItems((prev) => prev.filter((i) => i.id !== id))
    if (selectedId === id) setSelectedId(null)
    setIsEditing(false)

    const timer = setTimeout(() => commitDelete(id), DELETE_FALLBACK_MS)
    pendingDeletes.current.set(id, { item, timer })

    toast.create({
      title: `"${item.title}" deleted`,
      duration: UNDO_DELETE_MS,
      action: { label: 'Undo', onClick: () => undoDelete(id) },
      // Undo clears the pending entry first, so this is a no-op after Undo
      onStatusChange: ({ status }) => {
        if (status === 'dismissing') commitDelete(id)
      },
    })
  }

  // Toggle Favorite
  const toggleFavorite = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    await saveItem({
      ...item,
      isFavorite: !item.isFavorite,
    })
  }

  // Batch Import
  const importBatch = async (
    newItems: Partial<DecryptedItem>[],
  ): Promise<number> => {
    if (!vaultKey) throw new Error('Vault is locked')

    const encryptedBatch: Array<{ id: string; encryptedData: string }> = []

    for (const item of newItems) {
      const type = item.type || 'login'
      const payload = toEncryptedPayload({ ...item, type }, 'Imported Item')
      encryptedBatch.push({
        // Always a new id: an imported file's ids may clash with existing
        // items (importing the same export twice) or not be ids at all
        id: crypto.randomUUID(),
        encryptedData: await encryptData(payload, vaultKey),
      })
    }

    await batchImportVaultItems({ data: { items: encryptedBatch } })
    await refreshItems()
    return encryptedBatch.length
  }

  // Export Decrypted JSON
  const exportDecryptedJSON = () => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        items: items.map((item) => ({
          ...item,
        })),
      },
      null,
      2,
    )
  }

  // Change the master password. Only the wrapped vault key changes, so the
  // items, recovery kit and trusted devices keep working.
  const updateMasterPassword = async (currentPass: string, newPass: string) => {
    if (!user || !vaultKey) throw new Error('Vault must be unlocked')

    const current = await unlockWithPassword(
      currentPass,
      'Current master password is incorrect.',
    )
    const keys = await passwordKeys(newPass, current.raw)
    const res = await changeMasterPassword({
      data: { oldAuthKey: current.authKey, keys, reason: 'password' },
    })
    if (!res.success) {
      throw new Error(res.error || 'Failed to update master password.')
    }
  }

  // Recovery kit status, loaded once the vault is open
  useEffect(() => {
    if (!isUnlocked) return
    let cancelled = false
    getRecoveryStatus()
      .then((status) => {
        if (!cancelled) setRecoveryCreatedAt(status.createdAt)
      })
      .catch((err) => console.error('Failed to load recovery status', err))
    return () => {
      cancelled = true
    }
  }, [isUnlocked])

  // Create or replace the recovery kit (the old key stops working)
  const createRecoveryKit = async (masterPass: string) => {
    if (!user) throw new Error('Vault must be unlocked')
    const { authKey, raw } = await unlockWithPassword(masterPass)
    const kit = await createRecoveryKitMaterial(raw)
    const res = await setRecoveryKit({
      data: { authKey, recovery: kit.material },
    })
    if (!res.success) {
      throw new Error(res.error || 'Could not create a recovery kit.')
    }
    setRecoveryCreatedAt(res.createdAt)
    setPendingRecoveryKey(kit.recoveryKey)
  }

  // Forgotten master password: open the vault key with the recovery key or
  // this browser's device key, wrap it with a new master password and issue
  // a fresh recovery key (the old one may have been exposed by using it).
  const recoverVault = async (
    email: string,
    ticket: string,
    method: RecoveryMethod,
    newMasterPass: string,
    trust: TrustOptions = {},
  ) => {
    let proof: Parameters<typeof startRecovery>[0]['data']['proof']
    let unwrap: (wrappedKey: string) => Promise<Uint8Array>
    if (method.kind === 'device') {
      const deviceProof = await getDeviceProof(email)
      if (!deviceProof) {
        throw new Error('This browser isn’t a trusted device for this vault.')
      }
      proof = { kind: 'device', ...deviceProof }
      unwrap = (wrappedKey) => unwrapWithDevice(email, wrappedKey)
    } else {
      const { keyBytes, authKey } = await readRecoveryKey(method.recoveryKey)
      proof = { kind: 'recoveryKey', authKey }
      unwrap = (wrappedKey) => unwrapVaultKey(wrappedKey, keyBytes)
    }

    const start = await startRecovery({ data: { email, ticket, proof } })
    if (!start.success) throw new Error(start.error)

    const opened = await openKey(await unwrap(start.wrappedKey))

    const keys = await passwordKeys(newMasterPass, opened.raw)
    const kit = await createRecoveryKitMaterial(opened.raw)
    const device = await chosenEnrollment(email, opened.raw, trust)

    const res = await completeRecovery({
      data: {
        email,
        ticket,
        proof,
        keys,
        newRecovery: kit.material,
        device: device?.enrollment,
      },
    })
    if (!res.success) {
      if (device?.created) await forgetThisDevice(email)
      throw new Error(res.error)
    }
    // The server already dropped every device not sent along
    await applyTrustChoice(email, trust, { removeOnServer: false })

    setUser(res.user)
    setVaultKey(opened.key)
    setIsUnlocked(true)
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
    await fetchAndDecryptItems(opened.key)
  }

  // No recovery key or trusted device: start a new, empty vault with a new
  // vault key. The old items are locked away on the server, still encrypted
  // with the old vault key, and can be restored later from Settings.
  const resetVault = async (
    email: string,
    ticket: string,
    newMasterPass: string,
    trust: TrustOptions = {},
  ) => {
    const opened = await openKey(generateVaultKeyBytes())
    const keys = await passwordKeys(newMasterPass, opened.raw)
    const kit = await createRecoveryKitMaterial(opened.raw)
    const device = await chosenEnrollment(email, opened.raw, trust)

    const res = await resetAccountOnServer({
      data: {
        email,
        ticket,
        keys,
        recovery: kit.material,
        device: device?.enrollment,
      },
    })
    if (!res.success) {
      if (device?.created) await forgetThisDevice(email)
      throw new Error(res.error)
    }
    // The reset already moved every old device record into the locked vault
    await applyTrustChoice(email, trust, { removeOnServer: false })

    setUser(res.user)
    setVaultKey(opened.key)
    setItems([])
    setSelectedId(null)
    setIsUnlocked(true)
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
    return res.lockedItemCount
  }

  // Open a locked vault with its old password, old recovery key or this
  // browser (if it was trusted before the reset), then move its items into
  // the current vault, re-encrypted with the current key.
  const restoreLockedVault = async (
    vault: LockedVaultInfo,
    method: LockedVaultMethod,
  ) => {
    if (!user || !vaultKey) throw new Error('Vault must be unlocked')

    let proof: Parameters<typeof openLockedVault>[0]['data']['proof']
    let openOldKey: (wrappedKey: string) => Promise<Uint8Array>
    if (method.kind === 'password') {
      const derived = await deriveMasterKey(
        method.password,
        vault.salt,
        vault.kdf,
      )
      proof = { kind: 'password', authKey: derived.authKey }
      openOldKey = (wrappedKey) => unwrapKeyBytes(wrappedKey, derived.masterKey)
    } else if (method.kind === 'recoveryKey') {
      const { keyBytes, authKey } = await readRecoveryKey(method.recoveryKey)
      proof = { kind: 'recoveryKey', authKey }
      openOldKey = (wrappedKey) => unwrapVaultKey(wrappedKey, keyBytes)
    } else {
      const deviceProof = await getDeviceProof(user.email)
      if (!deviceProof) {
        throw new Error('This browser wasn’t trusted for this vault.')
      }
      proof = { kind: 'device', ...deviceProof }
      openOldKey = (wrappedKey) => unwrapWithDevice(user.email, wrappedKey)
    }

    const opened = await openLockedVault({ data: { id: vault.id, proof } })
    if (!opened.success) throw new Error(opened.error)
    const oldKey = await importAesKey(await openOldKey(opened.wrappedKey))

    const { items: restored } = await decryptRows(opened.items, oldKey, {
      strict: true,
    })
    const reEncrypted = await encryptItems(restored, vaultKey)

    const res = await restoreLockedVaultOnServer({
      data: { id: vault.id, proof, items: reEncrypted },
    })
    if (!res.success) throw new Error(res.error)

    await fetchAndDecryptItems(vaultKey)
    return res.count
  }

  // Delete a locked vault for good. Needs the current master password.
  const deleteLockedVault = async (vaultId: string, masterPass: string) => {
    if (!user) throw new Error('Vault must be unlocked')
    const { authKey } = await unlockWithPassword(masterPass)
    const res = await deleteLockedVaultOnServer({
      data: { id: vaultId, authKey },
    })
    if (!res.success) throw new Error(res.error)
  }

  // Trust this browser for recovery again, after it was turned off here
  const trustThisDevice = async (masterPass: string) => {
    if (!user) throw new Error('Vault must be unlocked')
    const { authKey, raw } = await unlockWithPassword(masterPass)
    const device = await prepareEnrollment(user.email, raw, { force: true })
    if (!device) {
      throw new Error('This browser can’t store a device key.')
    }
    const res = await trustThisDeviceOnServer({
      data: { authKey, device: device.enrollment },
    })
    if (!res.success) {
      // Back to how it was: not trusted, and not re-trusted on next unlock
      await forgetThisDevice(user.email, { optOut: true })
      throw new Error(res.error || 'Could not trust this device.')
    }
    clearDeviceOptOut(user.email)
  }

  // Delete the account for good. The master password is checked by the
  // server; afterwards nothing of the account is left in memory or, for its
  // device key, in this browser.
  const deleteAccount = async (
    masterPass: string,
    beforeSignOut?: () => Promise<void>,
  ) => {
    if (!user) throw new Error('Vault must be unlocked')
    const email = user.email
    const { authKey } = await unlockWithPassword(masterPass)

    const res = await deleteAccountOnServer({ data: { authKey } })
    if (!res.success) throw new Error(res.error)

    // Pending "undo delete" toasts refer to rows that no longer exist
    for (const { timer } of pendingDeletes.current.values()) clearTimeout(timer)
    pendingDeletes.current.clear()

    await forgetThisDevice(email)
    await beforeSignOut?.()
    lockVault()
    setUser(null)
    setRecoveryCreatedAt(undefined)
    setPendingRecoveryKey(null)
  }

  // Erase all items for current user. Needs the master password.
  const eraseAllItems = async (masterPass: string) => {
    const { authKey } = await unlockWithPassword(masterPass)
    const res = await deleteAllVaultItems({ data: { authKey } })
    if (!res.success) throw new Error(res.error)
    // Items waiting on an undo toast are gone from the server already
    for (const { timer } of pendingDeletes.current.values()) clearTimeout(timer)
    pendingDeletes.current.clear()
    setItems([])
    setSelectedId(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const item of items) {
      for (const tag of item.tags ?? []) tagSet.add(tag)
    }
    return Array.from(tagSet).sort()
  }, [items])

  // Computed Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory === 'login' && item.type !== 'login') return false
      if (selectedCategory === 'note' && item.type !== 'note') return false
      if (selectedCategory === 'favorites' && !item.isFavorite) return false

      // Tag filter
      if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchNotes = item.notes?.toLowerCase().includes(query) || false
        const matchTags =
          item.tags?.some((t) => t.toLowerCase().includes(query)) || false
        let matchLogin = false
        if (item.type === 'login') {
          matchLogin =
            item.username.toLowerCase().includes(query) ||
            (item.url ? item.url.toLowerCase().includes(query) : false)
        }
        if (!matchTitle && !matchNotes && !matchTags && !matchLogin) {
          return false
        }
      }

      return true
    })
  }, [items, selectedCategory, selectedTag, searchQuery])

  // Active Selected Item
  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((i) => i.id === selectedId) || null
  }, [items, selectedId])

  return (
    <VaultContext.Provider
      value={{
        user,
        isUnlocked,
        isLoading,
        items,
        filteredItems,
        selectedItem,
        selectedId,
        setSelectedId,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedTag,
        setSelectedTag,
        allTags,
        isEditing,
        setIsEditing,
        isCreating,
        setIsCreating,
        createType,
        setCreateType,
        autoLockMinutes,
        setAutoLockMinutes,
        clipboardClearSeconds,
        setClipboardClearSeconds,
        copySecureText,
        updateMasterPassword,
        eraseAllItems,
        recoveryCreatedAt,
        pendingRecoveryKey,
        dismissRecoveryKey: () => setPendingRecoveryKey(null),
        createRecoveryKit,
        recoverVault,
        resetVault,
        restoreLockedVault,
        deleteLockedVault,
        trustThisDevice,
        deleteAccount,
        handleLogin,
        handleRegister,
        handleUnlock,
        lockVault,
        handleLogout,
        saveItem,
        removeItem,
        toggleFavorite,
        importBatch,
        exportDecryptedJSON,
        refreshItems,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return ctx
}
