import React, { useState } from 'react'
import {
  Shield,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { getPasswordStrength } from '../lib/crypto'

export const AuthModal: React.FC = () => {
  const {
    user,
    isUnlocked,
    handleUnlock,
    handleLogin,
    handleRegister,
    handleLogout,
  } = useVault()

  const [mode, setMode] = useState<'unlock' | 'login' | 'register'>(
    user ? 'unlock' : 'login'
  )

  const [email, setEmail] = useState(user?.email || '')
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // If already unlocked, do not show modal
  if (isUnlocked) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (user || mode === 'unlock') {
        await handleUnlock(masterPassword)
      } else if (mode === 'login') {
        if (!email.trim() || !masterPassword) {
          throw new Error('Please enter both your email and master password.')
        }
        await handleLogin(email.trim(), masterPassword)
      } else if (mode === 'register') {
        if (!email.trim() || !masterPassword) {
          throw new Error('Please enter both your email and master password.')
        }
        if (masterPassword.length < 10) {
          throw new Error('Master password must be at least 10 characters long.')
        }
        if (masterPassword !== confirmPassword) {
          throw new Error('Master passwords do not match.')
        }
        await handleRegister(email.trim(), masterPassword)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(masterPassword)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Brand Header */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-900/60">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-600/30 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            {user
              ? 'Unlock 1Vault'
              : mode === 'register'
              ? 'Create Your Vault'
              : 'Sign In to 1Vault'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {user
              ? `Enter master password for ${user.email}`
              : mode === 'register'
              ? 'Zero-knowledge end-to-end encrypted storage'
              : 'Decrypted directly in your browser'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Email input (only if not already remembered via user session) */}
          {!user && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Master Password input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter Master Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors"
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

            {mode === 'register' && masterPassword && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                  {[0, 1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className="flex-1 h-full transition-colors"
                      style={{
                        backgroundColor:
                          step < pwStrength.score
                            ? pwStrength.color
                            : 'transparent',
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: pwStrength.color }}
                >
                  {pwStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password (only for register) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Master Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat Master Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Deriving Keys & Unlocking...</span>
            ) : user ? (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Unlock Vault</span>
              </>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Encrypted Vault</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Unlock Vault</span>
              </>
            )}
          </button>

          {/* Switch Modes / Sign Out */}
          <div className="pt-2 text-center text-xs text-slate-400">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-200 underline"
              >
                Sign out of this vault
              </button>
            ) : mode === 'login' ? (
              <p>
                Don't have a vault yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError(null)
                  }}
                  className="text-blue-400 hover:underline font-medium"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p>
                Already have a vault?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                  className="text-blue-400 hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>

        {/* Security Assurance Badge */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3 text-blue-400" />
          <span>PBKDF2 600k + AES-256-GCM Zero-Knowledge</span>
        </div>
      </div>
    </div>
  )
}
