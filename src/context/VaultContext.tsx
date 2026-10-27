import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import type { DecryptedItem, ItemType, UserSession } from '../types/vault'
import {
  deriveKeys,
  generateSalt,
  encryptData,
  decryptData,
} from '../lib/crypto'
import {
  getCurrentUser,
  getPreloginData,
  loginUser,
  registerUser,
  logoutUser,
  changeMasterPassword,
} from '../server/auth'
import {
  getEncryptedVaultItems,
  saveVaultItem,
  deleteVaultItem,
  batchImportVaultItems,
  deleteAllVaultItems,
} from '../server/vault'

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
}

const VaultContext = createContext<VaultContextType | null>(null)

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
  const [clipboardClearSeconds, setClipboardClearSecondsState] = useState<number>(() => {
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
  const fetchAndDecryptItems = useCallback(async (key: CryptoKey) => {
    try {
      const encryptedRows = await getEncryptedVaultItems()
      const decrypted: DecryptedItem[] = []

      for (const row of encryptedRows) {
        try {
          const payload = await decryptData(row.encryptedData, key)
          decrypted.push({
            ...payload,
            id: row.id,
            type: row.type,
            isFavorite: row.isFavorite,
            tags: row.tags || [],
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
        } catch (decryptErr) {
          console.error(`Failed to decrypt item ${row.id}`, decryptErr)
        }
      }

      setItems(decrypted)
      if (decrypted.length > 0 && !selectedId) {
        setSelectedId(decrypted[0].id)
      }
    } catch (err) {
      console.error('Failed to load items', err)
    }
  }, [selectedId])

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
      prelogin.kdfIterations
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
    const { vaultKey: derivedKey, authKey } = await deriveKeys(
      masterPass,
      salt,
      iterations
    )

    const result = await registerUser({
      data: {
        email,
        salt,
        authKey,
        kdfIterations: iterations,
      },
    })

    if (!result.success || !result.user) {
      throw new Error(result.error || 'Failed to create account.')
    }

    setUser(result.user)
    setVaultKey(derivedKey)
    setIsUnlocked(true)
    setItems([])
  }

  // Unlock when session is already active
  const handleUnlock = async (masterPass: string) => {
    if (!user) throw new Error('No user session active')
    const prelogin = await getPreloginData({ data: { email: user.email } })
    const { vaultKey: derivedKey, authKey } = await deriveKeys(
      masterPass,
      prelogin.salt,
      prelogin.kdfIterations
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
      await logoutUser()
      lockVault()
      setUser(null)
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
    const tags = itemData.tags || []
    const now = Date.now()

    // Plaintext payload to encrypt
    const payloadToEncrypt = {
      title: itemData.title || 'Untitled',
      notes: itemData.notes || '',
      customFields: itemData.customFields || [],
      ...(type === 'login'
        ? {
            username: (itemData as any).username || '',
            password: (itemData as any).password || '',
            url: (itemData as any).url || '',
            totpSecret: (itemData as any).totpSecret || '',
          }
        : {}),
    }

    const encryptedData = await encryptData(payloadToEncrypt, vaultKey)

    await saveVaultItem({
      data: {
        id,
        type,
        encryptedData,
        isFavorite,
        tags,
      },
    })

    const updatedItem: DecryptedItem = {
      ...(payloadToEncrypt as any),
      id,
      type,
      isFavorite,
      tags,
      createdAt: itemData.createdAt || now,
      updatedAt: now,
    }

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

  // Remove Item
  const removeItem = async (id: string) => {
    await deleteVaultItem({ data: { id } })
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
    setIsEditing(false)
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
  const importBatch = async (newItems: Partial<DecryptedItem>[]): Promise<number> => {
    if (!vaultKey) throw new Error('Vault is locked')

    const encryptedBatch: Array<{
      id: string
      type: 'login' | 'note'
      encryptedData: string
      isFavorite: boolean
      tags: string[]
    }> = []

    for (const item of newItems) {
      const id = item.id || crypto.randomUUID()
      const type = item.type || 'login'
      const isFavorite = item.isFavorite ?? false
      const tags = item.tags || []

      const payload = {
        title: item.title || 'Imported Item',
        notes: item.notes || '',
        customFields: item.customFields || [],
        ...(type === 'login'
          ? {
              username: (item as any).username || '',
              password: (item as any).password || '',
              url: (item as any).url || '',
              totpSecret: (item as any).totpSecret || '',
            }
          : {}),
      }

      const encryptedData = await encryptData(payload, vaultKey)
      encryptedBatch.push({
        id,
        type,
        encryptedData,
        isFavorite,
        tags,
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
      2
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
      prelogin.kdfIterations
    )

    // 2. Generate new salt and derive new keys
    const newSalt = generateSalt()
    const { vaultKey: newVaultKey, authKey: newAuthKey } = await deriveKeys(
      newPass,
      newSalt,
      prelogin.kdfIterations || 600000
    )

    // 3. Re-encrypt all current items with new vault key
    const reEncryptedItems: Array<{ id: string; encryptedData: string }> = []
    for (const item of items) {
      const payload = {
        title: item.title || '',
        notes: item.notes || '',
        customFields: item.customFields || [],
        ...(item.type === 'login'
          ? {
              username: item.username || '',
              password: item.password || '',
              url: item.url || '',
              totpSecret: item.totpSecret || '',
            }
          : {}),
      }
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
      },
    })

    if (!res.success) {
      throw new Error(res.error || 'Failed to update master password.')
    }

    // 5. Update local state
    setVaultKey(newVaultKey)
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
    items.forEach((item) => {
      item.tags?.forEach((tag) => tagSet.add(tag))
    })
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
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(query)) || false
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
