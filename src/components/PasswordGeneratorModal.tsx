import { useState, useEffect } from 'react'
import { X, Copy, Check, RefreshCw, Key } from 'lucide-react'
import {
  generatePassword,
  getPasswordStrength,
  DEFAULT_GENERATOR_OPTIONS,
} from '../lib/crypto'
import type { PasswordGeneratorOptions } from '../lib/crypto'

interface PasswordGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(
    DEFAULT_GENERATOR_OPTIONS
  )
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const regenerate = () => {
    const pw = generatePassword(options)
    setGeneratedPassword(pw)
  }

  useEffect(() => {
    if (isOpen) {
      regenerate()
    }
  }, [isOpen, options])

  if (!isOpen) return null

  const strength = getPasswordStrength(generatedPassword)

  const handleCopy = async () => {
    if (!generatedPassword) return
    await navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Password Generator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Password Display Box */}
        <div className="p-5 space-y-5">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="font-mono text-base break-all text-slate-100 text-center tracking-wider py-2">
              {generatedPassword}
            </div>

            {/* Strength Meter */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className="flex-1 h-full transition-colors"
                    style={{
                      backgroundColor:
                        step < strength.score ? strength.color : 'transparent',
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[11px] font-semibold"
                style={{ color: strength.color }}
              >
                {strength.label}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={regenerate}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Password</span>
                </>
              )}
            </button>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            {/* Length Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Length</span>
                <span className="font-mono font-bold text-blue-400">
                  {options.length} characters
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={(e) =>
                  setOptions({ ...options, length: Number(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.uppercase}
                  onChange={(e) =>
                    setOptions({ ...options, uppercase: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.lowercase}
                  onChange={(e) =>
                    setOptions({ ...options, lowercase: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Lowercase (a-z)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.numbers}
                  onChange={(e) =>
                    setOptions({ ...options, numbers: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Numbers (0-9)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.symbols}
                  onChange={(e) =>
                    setOptions({ ...options, symbols: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Symbols (!@#$)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={options.avoidAmbiguous}
                  onChange={(e) =>
                    setOptions({ ...options, avoidAmbiguous: e.target.checked })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Avoid Ambiguous Characters (0, O, 1, l)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
