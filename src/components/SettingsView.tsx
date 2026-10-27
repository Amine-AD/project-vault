import { useState } from 'react'
import { useVault } from '../context/VaultContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Card, CardHeader, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Shield,
  Database,
  Sliders,
  User,
  KeyRound,
  Clock,
  ClipboardCheck,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  Lock,
  LogOut,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { ImportExportModal } from './ImportExportModal'

interface SettingsViewProps {
  onOpenImportExport?: () => void
}

export function SettingsView({ onOpenImportExport }: SettingsViewProps) {
  const [internalShowImport, setInternalShowImport] = useState(false)
  const {
    user,
    items,
    autoLockMinutes,
    setAutoLockMinutes,
    clipboardClearSeconds,
    setClipboardClearSeconds,
    exportDecryptedJSON,
    updateMasterPassword,
    eraseAllItems,
    lockVault,
    handleLogout,
  } = useVault()

  // Change Password state
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isUpdatingPass, setIsUpdatingPass] = useState(false)
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Danger zone modal state
  const [showEraseConfirm, setShowEraseConfirm] = useState(false)
  const [eraseInput, setEraseInput] = useState('')
  const [isErasing, setIsErasing] = useState(false)

  // Generator Preferences (persisted in localStorage)
  const [genLength, setGenLength] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault_gen_default_len')
      return saved ? parseInt(saved, 10) : 20
    }
    return 20
  })

  const [genSymbols, setGenSymbols] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault_gen_default_symbols')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })

  const [genNumbers, setGenNumbers] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault_gen_default_numbers')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })

  const handleSaveGeneratorPrefs = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_gen_default_len', genLength.toString())
      localStorage.setItem('vault_gen_default_symbols', genSymbols.toString())
      localStorage.setItem('vault_gen_default_numbers', genNumbers.toString())
    }
    alert('Generator preferences saved!')
  }

  // Handle Master Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassMessage(null)

    if (!currentPass) {
      setPassMessage({ type: 'error', text: 'Please enter your current master password.' })
      return
    }
    if (newPass.length < 10) {
      setPassMessage({ type: 'error', text: 'New master password must be at least 10 characters long.' })
      return
    }
    if (newPass !== confirmPass) {
      setPassMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    try {
      setIsUpdatingPass(true)
      await updateMasterPassword(currentPass, newPass)
      setPassMessage({
        type: 'success',
        text: 'Master password successfully updated! All items have been re-encrypted with your new key.',
      })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err: any) {
      setPassMessage({
        type: 'error',
        text: err?.message || 'Failed to update master password. Please verify your current password.',
      })
    } finally {
      setIsUpdatingPass(false)
    }
  }

  // Handle Export Backup
  const handleExportBackup = () => {
    const data = exportDecryptedJSON()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `1vault-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle Erase All Items
  const handleEraseAll = async () => {
    if (eraseInput !== 'ERASE ALL') return
    try {
      setIsErasing(true)
      await eraseAllItems()
      setShowEraseConfirm(false)
      setEraseInput('')
    } catch (err: any) {
      alert(err?.message || 'Failed to erase items.')
    } finally {
      setIsErasing(false)
    }
  }

  // Stats
  const loginsCount = items.filter((i) => i.type === 'login').length
  const notesCount = items.filter((i) => i.type === 'note').length
  const favoritesCount = items.filter((i) => i.isFavorite).length

  return (
    <div className="flex-1 h-full bg-slate-950 overflow-y-auto p-6 md:p-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            Vault Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your zero-knowledge security, auto-lock policies, backups, and preferences.
          </p>
        </div>

        {/* Shark UI Tabs */}
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-full flex flex-wrap sm:flex-nowrap gap-1">
            <TabsTrigger
              value="security"
              className="flex-1 py-2 text-xs font-medium text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              Security & Keys
            </TabsTrigger>

            <TabsTrigger
              value="data"
              className="flex-1 py-2 text-xs font-medium text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              Data & Backups
            </TabsTrigger>

            <TabsTrigger
              value="generator"
              className="flex-1 py-2 text-xs font-medium text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              Generator
            </TabsTrigger>

            <TabsTrigger
              value="account"
              className="flex-1 py-2 text-xs font-medium text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4 text-amber-400" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SECURITY & KEYS */}
          <TabsContent value="security" className="space-y-6 mt-4">
            {/* Auto Lock & Clipboard Settings */}
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Protection Policies"
                description="Configure automatic safeguards when your device is left unattended."
              />
              <CardContent className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">Idle Auto-Lock</div>
                      <div className="text-xs text-slate-400">
                        Automatically lock vault and purge memory keys after inactivity.
                      </div>
                    </div>
                  </div>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 Minute</option>
                    <option value={5}>5 Minutes</option>
                    <option value={15}>15 Minutes (Default)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={0}>Never (Not recommended)</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">Clipboard Auto-Clear</div>
                      <div className="text-xs text-slate-400">
                        Erase copied passwords from system clipboard after a delay.
                      </div>
                    </div>
                  </div>
                  <select
                    value={clipboardClearSeconds}
                    onChange={(e) => setClipboardClearSeconds(parseInt(e.target.value, 10))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 Seconds</option>
                    <option value={30}>30 Seconds (Default)</option>
                    <option value={60}>60 Seconds</option>
                    <option value={120}>2 Minutes</option>
                    <option value={0}>Never</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Change Master Password Card */}
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Change Master Password"
                description="Derives a brand new encryption key and re-encrypts all items client-side before sending to the server."
              />
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                  {passMessage && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        passMessage.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      {passMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      )}
                      <div>{passMessage.text}</div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Current Master Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        New Master Password
                      </label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min 10 characters"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Confirm New Password
                      </label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isUpdatingPass}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {isUpdatingPass ? 'Re-encrypting & Updating...' : 'Update Master Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DATA & BACKUPS */}
          <TabsContent value="data" className="space-y-6 mt-4">
            {/* Vault Stats */}
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Vault Overview & Statistics"
                description="Summary of your local encrypted credentials."
              />
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs text-slate-400">Total Items</div>
                    <div className="text-2xl font-bold text-slate-100 mt-1">{items.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs text-slate-400">Logins</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">{loginsCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs text-slate-400">Secure Notes</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{notesCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs text-slate-400">Favorites</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">{favoritesCount}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2 items-center text-xs text-slate-400">
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                    SQLite WAL
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                    AES-256-GCM
                  </Badge>
                  <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                    PBKDF2 600,000 rounds
                  </Badge>
                  <span className="text-slate-500 ml-auto">Zero-Knowledge Storage</span>
                </div>
              </CardContent>
            </Card>

            {/* Backup & Import */}
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Backup & Migration"
                description="Export decrypted backups or import credentials from 1Password, Bitwarden, or CSV."
              />
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Export Decrypted JSON</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Save a plaintext JSON backup of all credentials to migrate or store securely offline.
                    </div>
                  </div>
                  <Button
                    onClick={handleExportBackup}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Download JSON Backup
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Import CSV or JSON</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Batch import passwords from Bitwarden, Chrome, LastPass, or custom CSV files.
                    </div>
                  </div>
                  <Button
                    onClick={onOpenImportExport ? onOpenImportExport : () => setInternalShowImport(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Open Import Tool
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-red-950/20 border-red-900/40 shadow-sm">
              <CardHeader
                title="Danger Zone"
                description="Destructive actions that cannot be undone."
              />
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-red-200">Erase All Vault Items</div>
                    <div className="text-xs text-red-400/80 mt-0.5">
                      Permanently delete all stored credentials and notes from the database.
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowEraseConfirm(true)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Erase All Items
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: GENERATOR PREFERENCES */}
          <TabsContent value="generator" className="space-y-6 mt-4">
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Password Generator Defaults"
                description="Configure the default complexity rules applied when auto-generating passwords."
              />
              <CardContent className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-300">Default Length</span>
                    <span className="font-bold text-blue-400">{genLength} characters</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    value={genLength}
                    onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 bg-slate-950"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-slate-300">Include Numbers (0-9)</span>
                    <input
                      type="checkbox"
                      checked={genNumbers}
                      onChange={(e) => setGenNumbers(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-slate-300">Include Symbols (!@#$%^&*)</span>
                    <input
                      type="checkbox"
                      checked={genSymbols}
                      onChange={(e) => setGenSymbols(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveGeneratorPrefs}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-medium cursor-pointer"
                  >
                    Save Generator Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: ACCOUNT & SESSION */}
          <TabsContent value="account" className="space-y-6 mt-4">
            <Card className="bg-slate-900/70 border-slate-800 shadow-sm">
              <CardHeader
                title="Account Details"
                description="Information about your active vault account."
              />
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Email Address</span>
                    <span className="text-xs font-semibold text-slate-200">{user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Account ID</span>
                    <span className="text-xs font-mono text-slate-400">{user?.id || 'Local User'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Zero-Knowledge State</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Unlocked in Memory
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={lockVault}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Lock Vault Now
                  </Button>

                  <Button
                    onClick={handleLogout}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Erase Confirmation */}
        {showEraseConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-semibold text-slate-100">Permanently Erase All Items?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This action is irreversible. All your stored logins, secure notes, passwords, and custom fields will be deleted from the database.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">
                  Type <strong className="text-red-400">ERASE ALL</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={eraseInput}
                  onChange={(e) => setEraseInput(e.target.value)}
                  placeholder="ERASE ALL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEraseConfirm(false)
                    setEraseInput('')
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={eraseInput !== 'ERASE ALL' || isErasing}
                  onClick={handleEraseAll}
                  className="px-3.5 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isErasing ? 'Erasing...' : 'Confirm Erase'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Import/Export Tool */}
        <ImportExportModal
          isOpen={internalShowImport}
          onClose={() => setInternalShowImport(false)}
        />
      </div>
    </div>
  )
}
