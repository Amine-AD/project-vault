import React, { useState, useEffect } from 'react'
import {
  KeyRound,
  FileText,
  Star,
  Edit2,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Clock,
  Sparkles,
  Save,
  X,
  Tag,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'
import type { CustomField, DecryptedItem, ItemType, LoginItem } from '../types/vault'
import {
  generatePassword,
  getPasswordStrength,
  getTOTPInfo,
} from '../lib/crypto'

export const ItemDetail: React.FC = () => {
  const {
    selectedItem,
    isCreating,
    isEditing,
    setIsEditing,
    setIsCreating,
    createType,
    saveItem,
    removeItem,
    toggleFavorite,
  } = useVault()

  // Copy notification state
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Live TOTP state
  const [totpCode, setTotpCode] = useState<string | null>(null)
  const [totpSeconds, setTotpSeconds] = useState(30)

  // Form states for Editing / Creating
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [notes, setNotes] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Populate form on selection or edit trigger
  useEffect(() => {
    if (isCreating) {
      setTitle('')
      setUsername('')
      setPassword(createType === 'login' ? generatePassword() : '')
      setUrl('')
      setTotpSecret('')
      setNotes('')
      setTagsInput('')
      setCustomFields([])
      setIsFavorite(false)
      setShowPassword(true)
    } else if (selectedItem) {
      setTitle(selectedItem.title || '')
      setNotes(selectedItem.notes || '')
      setTagsInput((selectedItem.tags || []).join(', '))
      setCustomFields(selectedItem.customFields || [])
      setIsFavorite(selectedItem.isFavorite || false)
      setShowPassword(false)

      if (selectedItem.type === 'login') {
        setUsername(selectedItem.username || '')
        setPassword(selectedItem.password || '')
        setUrl(selectedItem.url || '')
        setTotpSecret(selectedItem.totpSecret || '')
      }
    }
  }, [selectedItem, isCreating, isEditing, createType])

  // Live TOTP ticker
  useEffect(() => {
    const activeSecret =
      (isEditing || isCreating) ? totpSecret : (selectedItem as LoginItem)?.totpSecret

    if (!activeSecret) {
      setTotpCode(null)
      return
    }

    const updateTOTP = () => {
      const info = getTOTPInfo(activeSecret)
      setTotpCode(info.code)
      setTotpSeconds(info.secondsRemaining)
    }

    updateTOTP()
    const interval = setInterval(updateTOTP, 1000)
    return () => clearInterval(interval)
  }, [selectedItem, isEditing, isCreating, totpSecret])

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const type: ItemType = isCreating ? createType : selectedItem!.type
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const payload: Partial<DecryptedItem> = {
        ...(isCreating ? {} : { id: selectedItem?.id }),
        type,
        title: title.trim() || 'Untitled',
        notes: notes.trim(),
        tags: parsedTags,
        customFields,
        isFavorite,
        createdAt: isCreating ? Date.now() : selectedItem?.createdAt,
        updatedAt: Date.now(),
      }

      if (type === 'login') {
        ;(payload as Partial<LoginItem>).username = username.trim()
        ;(payload as Partial<LoginItem>).password = password
        ;(payload as Partial<LoginItem>).url = url.trim()
        ;(payload as Partial<LoginItem>).totpSecret = totpSecret.trim()
      }

      await saveItem(payload)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: crypto.randomUUID(),
        name: '',
        value: '',
        type: 'text',
      },
    ])
  }

  const handleUpdateCustomField = (
    id: string,
    updates: Partial<CustomField>
  ) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id))
  }

  // Blank State when no item is selected and not creating
  if (!selectedItem && !isCreating) {
    return (
      <main className="flex-1 bg-slate-900 flex items-center justify-center p-8 select-none">
        <div className="text-center text-slate-500 max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-slate-300">
            No Item Selected
          </h2>
          <p className="text-xs leading-relaxed">
            Select an item from the list to view its credentials, or create a
            new login or secure note.
          </p>
        </div>
      </main>
    )
  }

  const isFormActive = isCreating || isEditing
  const passwordStrength = getPasswordStrength(password)

  return (
    <main className="flex-1 bg-slate-900 flex flex-col h-screen overflow-y-auto select-none">
      {isFormActive ? (
        /* ================= EDIT / CREATE FORM ================= */
        <form onSubmit={handleSave} className="max-w-2xl w-full mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  (isCreating ? createType : selectedItem?.type) === 'login'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {(isCreating ? createType : selectedItem?.type) === 'login' ? (
                  <KeyRound className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  {isCreating
                    ? `New ${createType === 'login' ? 'Login' : 'Secure Note'}`
                    : `Edit ${selectedItem?.title}`}
                </h2>
                <span className="text-xs text-slate-400">
                  Fill in your encrypted item details
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setIsCreating(false)
                }}
                className="px-3 py-1.5 rounded-md border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Item'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GitHub, Google, Wi-Fi Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Login Specific Fields */}
            {(isCreating ? createType : selectedItem?.type) === 'login' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Website URL */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://github.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Password with Generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(generatePassword())}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate Strong
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter or generate password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md pl-3 pr-10 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className="flex-1 h-full transition-colors"
                            style={{
                              backgroundColor:
                                step < passwordStrength.score
                                  ? passwordStrength.color
                                  : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2FA / TOTP Secret */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    One-Time Password Secret (2FA Key)
                  </label>
                  <input
                    type="text"
                    value={totpSecret}
                    onChange={(e) => setTotpSecret(e.target.value)}
                    placeholder="e.g. JBSWY3DPEHPK3PXP (Base32 format)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 uppercase"
                  />
                  {totpCode && (
                    <p className="mt-1 text-[11px] text-emerald-400">
                      Live Preview: <strong className="font-mono">{totpCode}</strong> ({totpSeconds}s remaining)
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Custom Fields Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-300">
                  Custom Fields
                </label>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Add Field
                </button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 bg-slate-950 p-2 rounded-md border border-slate-800"
                    >
                      <input
                        type="text"
                        placeholder="Field Label (e.g. PIN, Security Q)"
                        value={field.name}
                        onChange={(e) =>
                          handleUpdateCustomField(field.id, {
                            name: e.target.value,
                          })
                        }
                        className="w-1/3 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type={field.type === 'hidden' ? 'password' : 'text'}
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) =>
                          handleUpdateCustomField(field.id, {
                            value: e.target.value,
                          })
                        }
                        className="flex-1 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleUpdateCustomField(field.id, {
                            type: e.target.value as 'text' | 'hidden',
                          })
                        }
                        className="bg-slate-900 border border-slate-700/60 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                      >
                        <option value="text">Text</option>
                        <option value="hidden">Hidden</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="work, personal, banking"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Notes Textarea */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Secure Notes
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Encrypted notes, recovery codes, or memo..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>
          </div>
        </form>
      ) : (
        /* ================= VIEW MODE ================= */
        <div className="max-w-3xl w-full mx-auto p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                  selectedItem!.type === 'login'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {selectedItem!.type === 'login' ? (
                  <KeyRound className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-100">
                    {selectedItem!.title || 'Untitled'}
                  </h1>
                  <button
                    onClick={() => toggleFavorite(selectedItem!.id)}
                    className="p-1 rounded text-amber-400 hover:text-amber-300"
                  >
                    <Star
                      className="w-4 h-4"
                      fill={selectedItem!.isFavorite ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  {selectedItem!.type === 'login' ? 'Login Credential' : 'Secure Note'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this item?')) {
                    removeItem(selectedItem!.id)
                  }
                }}
                className="p-1.5 rounded-md border border-rose-900/40 text-rose-400 hover:bg-rose-950/40 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Login Fields Container */}
          {selectedItem!.type === 'login' && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/70 overflow-hidden shadow-sm">
              {/* Username Field */}
              {(selectedItem as LoginItem).username && (
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">
                      Username / Email
                    </div>
                    <div className="text-sm font-medium text-slate-100 mt-0.5 select-text">
                      {(selectedItem as LoginItem).username}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        (selectedItem as LoginItem).username,
                        'username'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {copiedField === 'username' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Password Field */}
              {(selectedItem as LoginItem).password && (
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="text-[11px] font-medium text-slate-400">
                      Password
                    </div>
                    <div className="text-sm font-mono text-slate-100 mt-0.5 select-text">
                      {showPassword
                        ? (selectedItem as LoginItem).password
                        : '••••••••••••••••'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          (selectedItem as LoginItem).password,
                          'password'
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      {copiedField === 'password' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 2FA / TOTP Live Code */}
              {(selectedItem as LoginItem).totpSecret && (
                <div className="p-3.5 flex items-center justify-between bg-blue-950/20">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-blue-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>One-Time Password (2FA)</span>
                    </div>
                    <div className="text-lg font-bold font-mono tracking-wider text-slate-100 mt-0.5 select-text">
                      {totpCode
                        ? `${totpCode.slice(0, 3)} ${totpCode.slice(3)}`
                        : 'Invalid Secret'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Countdown indicator */}
                    <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {totpSeconds}s
                    </div>
                    <button
                      onClick={() => copyToClipboard(totpCode || '', 'totp')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium transition-colors"
                    >
                      {copiedField === 'totp' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Website URL */}
              {(selectedItem as LoginItem).url && (
                <div className="p-3.5 flex items-center justify-between">
                  <div className="truncate mr-4">
                    <div className="text-[11px] font-medium text-slate-400">
                      Website URL
                    </div>
                    <a
                      href={
                        (selectedItem as LoginItem).url?.startsWith('http')
                          ? (selectedItem as LoginItem).url
                          : `https://${(selectedItem as LoginItem).url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-0.5 truncate block"
                    >
                      {(selectedItem as LoginItem).url}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={
                        (selectedItem as LoginItem).url?.startsWith('http')
                          ? (selectedItem as LoginItem).url
                          : `https://${(selectedItem as LoginItem).url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-100"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() =>
                        copyToClipboard((selectedItem as LoginItem).url || '', 'url')
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      {copiedField === 'url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Fields Container */}
          {selectedItem!.customFields && selectedItem!.customFields.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Custom Fields
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/70 overflow-hidden shadow-sm">
                {selectedItem!.customFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-medium text-slate-400">
                        {field.name || 'Custom Field'}
                      </div>
                      <div className="text-sm font-mono text-slate-100 mt-0.5 select-text">
                        {field.type === 'hidden' && !showPassword
                          ? '••••••••'
                          : field.value}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(field.value, field.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      {copiedField === field.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {selectedItem!.notes && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Notes
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                {selectedItem!.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {selectedItem!.tags && selectedItem!.tags.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex flex-wrap gap-1.5">
                {selectedItem!.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>
              Updated: {new Date(selectedItem!.updatedAt).toLocaleString()}
            </span>
            <span>
              Created: {new Date(selectedItem!.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </main>
  )
}
