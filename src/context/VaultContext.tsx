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
  deriveKeys,
  encryptData,
  generateSalt,
} from '../lib/crypto'
import {
  createRecoveryKit as createRecoveryKitMaterial,
  parseRecoveryKey,
  recoveryAuthKey,
  unwrapVaultKey,
} from '../lib/recovery'
import {
  changeMasterPassword,
  completeRecovery,
  getCurrentUser,
  getPreloginData,
  getRecoveryStatus,
  loginUser,
  logoutUser,
  registerUser,
  setRecoveryKit,
  startRecovery,
} from '../server/auth'
import type { ClientVaultRow } from '../server/item-rows'
import {
  batchImportVaultItems,
  deleteAllVaultItems,
  deleteVaultItem,
  getEncryptedVaultItems,
  rewrapVaultItems,
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
  handleLogin: (email: string, masterPass: string) => Promise<void>
  handleRegister: (email: string, masterPass: string) => Promise<void>
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
  eraseAllItems: () => Promise<void>
  // Recovery kit
  /** When the kit was made; null if there is none, undefined while loading. */
  recoveryCreatedAt: number | null | undefined
  /** A freshly made recovery key the user still has to save, if any. */
  pendingRecoveryKey: string | null
  dismissRecoveryKey: () => void
  createRecoveryKit: (masterPass: string) => Promise<void>
  recoverVault: (
    email: string,
    recoveryKey: string,
    newMasterPass: string,
  ) => Promise<void>
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
 * Decrypts server rows. Rows written before metadata was encrypted fall back
 * to the legacy plaintext columns and are returned in `legacy` so they can
 * be re-encrypted. With `strict`, any row that fails to decrypt throws
 * (used where skipping one would lose it, like recovery).
 */
async function decryptRows(
  rows: ClientVaultRow[],
  key: CryptoKey,
  { strict = false } = {},
) {
  const items: DecryptedItem[] = []
  const legacy: DecryptedItem[] = []

  for (const row of rows) {
    try {
      const payload = await decryptData<Partial<DecryptedItem>>(
        row.encryptedData,
        key,
      )
      const item = {
        ...payload,
        id: row.id,
        type: payload.type ?? row.legacy.type ?? 'login',
        isFavorite: payload.isFavorite ?? row.legacy.isFavorite,
        tags: payload.tags ?? row.legacy.tags,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as DecryptedItem
      items.push(item)

      const hasPlaintextMetadata =
        row.legacy.type !== null ||
        row.legacy.isFavorite ||
        row.legacy.tags.length > 0
      if (hasPlaintextMetadata || payload.type === undefined) legacy.push(item)
    } catch (err) {
      if (strict) throw new Error('Some items could not be decrypted.')
      console.error(`Failed to decrypt item ${row.id}`, err)
    }
  }

  return { items, legacy }
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
      try {
        const rows = await getEncryptedVaultItems()
        const { items: decrypted, legacy } = await decryptRows(rows, key)
        setItems(decrypted)

        if (legacy.length > 0) {
          const rewrapped = await Promise.all(
            legacy.map(async (item) => ({
              id: item.id,
              encryptedData: await encryptData(
                toEncryptedPayload(item, item.title),
                key,
              ),
            })),
          )
          rewrapVaultItems({ data: { items: rewrapped } }).catch((err) =>
            console.error('Failed to migrate item metadata', err),
          )
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

  // Login & Unlock
  const handleLogin = async (email: string, masterPass: string) => {
    const prelogin = await getPreloginData({ data: { email } })
    if (!prelogin.exists) {
      throw new Error('No vault found for this email address.')
    }

    const { vaultKey: derivedKey, authKey } = await deriveKeys(
      masterPass,
      prelogin.salt,
      prelogin.kdfIterations,
    )

    const result = await loginUser({ data: { email, authKey } })
    if (!result.success || !result.user) {
      throw new Error(result.error || 'Authentication failed.')
    }

    setUser(result.user)
    setVaultKey(derivedKey)
    setIsUnlocked(true)
    await fetchAndDecryptItems(derivedKey)
  }

  // Register & Unlock
  const handleRegister = async (email: string, masterPass: string) => {
    const salt = generateSalt()
    const iterations = 600000
    const {
      vaultKey: derivedKey,
      authKey,
      rawVaultKey,
    } = await deriveKeys(masterPass, salt, iterations)
    const kit = await createRecoveryKitMaterial(rawVaultKey)

    const result = await registerUser({
      data: {
        email,
        salt,
        authKey,
        kdfIterations: iterations,
        recovery: kit.material,
      },
    })

    if (!result.success || !result.user) {
      throw new Error(result.error || 'Failed to create account.')
    }

    setUser(result.user)
    setVaultKey(derivedKey)
    setIsUnlocked(true)
    setItems([])
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
  }

  // Unlock when session is already active
  const handleUnlock = async (masterPass: string) => {
    if (!user) throw new Error('No user session active')
    const prelogin = await getPreloginData({ data: { email: user.email } })
    const { vaultKey: derivedKey, authKey } = await deriveKeys(
      masterPass,
      prelogin.salt,
      prelogin.kdfIterations,
    )

    // Test key by validating against server
    const result = await loginUser({ data: { email: user.email, authKey } })
    if (!result.success) {
      throw new Error(result.error || 'Invalid email or master password.')
    }

    setVaultKey(derivedKey)
    setIsUnlocked(true)
    await fetchAndDecryptItems(derivedKey)
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
        id: item.id || crypto.randomUUID(),
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

  // Update Master Password (re-encrypts all items with new key)
  const updateMasterPassword = async (currentPass: string, newPass: string) => {
    if (!user || !vaultKey) throw new Error('Vault must be unlocked')

    // 1. Validate current master password by deriving old keys
    const prelogin = await getPreloginData({ data: { email: user.email } })
    const { authKey: oldAuthKey } = await deriveKeys(
      currentPass,
      prelogin.salt,
      prelogin.kdfIterations,
    )

    // 2. Generate new salt and derive new keys
    const newSalt = generateSalt()
    const {
      vaultKey: newVaultKey,
      authKey: newAuthKey,
      rawVaultKey: newRawVaultKey,
    } = await deriveKeys(newPass, newSalt, prelogin.kdfIterations || 600000)
    // The old kit wraps the old key, so a new kit comes with the new password
    const kit = await createRecoveryKitMaterial(newRawVaultKey)

    // 3. Re-encrypt all current items with new vault key
    const reEncryptedItems: Array<{ id: string; encryptedData: string }> = []
    for (const item of items) {
      const payload = toEncryptedPayload(item, '')
      const encryptedData = await encryptData(payload, newVaultKey)
      reEncryptedItems.push({ id: item.id, encryptedData })
    }

    // 4. Send to server
    const res = await changeMasterPassword({
      data: {
        oldAuthKey,
        newSalt,
        newAuthKey,
        reEncryptedItems,
        newRecovery: kit.material,
      },
    })

    if (!res.success) {
      throw new Error(res.error || 'Failed to update master password.')
    }

    // 5. Update local state
    setVaultKey(newVaultKey)
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
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
    const prelogin = await getPreloginData({ data: { email: user.email } })
    const { authKey, rawVaultKey } = await deriveKeys(
      masterPass,
      prelogin.salt,
      prelogin.kdfIterations,
    )
    const kit = await createRecoveryKitMaterial(rawVaultKey)
    const res = await setRecoveryKit({
      data: { authKey, recovery: kit.material },
    })
    if (!res.success) {
      throw new Error(res.error || 'Could not create a recovery kit.')
    }
    setRecoveryCreatedAt(res.createdAt)
    setPendingRecoveryKey(kit.recoveryKey)
  }

  // Forgotten master password: unlock with the recovery key, re-encrypt
  // everything under a new password and issue a fresh recovery key.
  const recoverVault = async (
    email: string,
    recoveryKeyInput: string,
    newMasterPass: string,
  ) => {
    const keyBytes = parseRecoveryKey(recoveryKeyInput)
    if (!keyBytes) {
      throw new Error(
        'That doesn’t look like a recovery key. It starts with OV- and has 32 letters and numbers after it.',
      )
    }
    const proof = await recoveryAuthKey(keyBytes)

    const start = await startRecovery({
      data: { email, recoveryAuthKey: proof },
    })
    if (!start.success) throw new Error(start.error)

    const oldKey = await unwrapVaultKey(start.wrappedKey, keyBytes)
    // Strict: skipping an item here would leave it unreadable for good
    const { items: recovered } = await decryptRows(start.items, oldKey, {
      strict: true,
    })

    const newSalt = generateSalt()
    const {
      vaultKey: newVaultKey,
      authKey: newAuthKey,
      rawVaultKey,
    } = await deriveKeys(newMasterPass, newSalt, start.kdfIterations)
    const reEncryptedItems = await Promise.all(
      recovered.map(async (item) => ({
        id: item.id,
        encryptedData: await encryptData(
          toEncryptedPayload(item, item.title),
          newVaultKey,
        ),
      })),
    )
    const kit = await createRecoveryKitMaterial(rawVaultKey)

    const res = await completeRecovery({
      data: {
        email,
        recoveryAuthKey: proof,
        newSalt,
        newAuthKey,
        reEncryptedItems,
        newRecovery: kit.material,
      },
    })
    if (!res.success) throw new Error(res.error)

    setUser(res.user)
    setVaultKey(newVaultKey)
    setItems(recovered)
    setSelectedId(recovered[0]?.id ?? null)
    setIsUnlocked(true)
    setRecoveryCreatedAt(Date.now())
    setPendingRecoveryKey(kit.recoveryKey)
  }

  // Erase all items for current user
  const eraseAllItems = async () => {
    await deleteAllVaultItems()
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
