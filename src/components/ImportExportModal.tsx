import React, { useState } from 'react'
import {
  X,
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'
import type { DecryptedItem, LoginItem } from '../types/vault'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { exportDecryptedJSON, importBatch } = useVault()
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [parsedItems, setParsedItems] = useState<Partial<DecryptedItem>[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  // Handle Export File Download
  const handleExportJSON = () => {
    const jsonString = exportDecryptedJSON()
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `1vault-export-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Parse CSV Helper
  const parseCSV = (csvText: string): Partial<LoginItem>[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    // Helper to parse CSV line respecting quotes
    const parseLine = (text: string): string[] => {
      const result: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim())
          cur = ''
        } else {
          cur += char
        }
      }
      result.push(cur.trim())
      return result
    }

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase())
    const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('name'))
    const userIdx = headers.findIndex((h) => h.includes('user') || h.includes('login') || h.includes('email'))
    const passIdx = headers.findIndex((h) => h.includes('pass'))
    const urlIdx = headers.findIndex((h) => h.includes('url') || h.includes('website'))
    const notesIdx = headers.findIndex((h) => h.includes('note'))

    const items: Partial<LoginItem>[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i])
      if (cols.length === 0 || !cols.some((c) => c.length > 0)) continue

      items.push({
        type: 'login',
        title: (titleIdx >= 0 && cols[titleIdx]) ? cols[titleIdx] : 'Imported Login',
        username: (userIdx >= 0 && cols[userIdx]) ? cols[userIdx] : '',
        password: (passIdx >= 0 && cols[passIdx]) ? cols[passIdx] : '',
        url: (urlIdx >= 0 && cols[urlIdx]) ? cols[urlIdx] : '',
        notes: (notesIdx >= 0 && cols[notesIdx]) ? cols[notesIdx] : '',
        tags: ['imported'],
        isFavorite: false,
      })
    }

    return items
  }

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportStatus(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content)
          const itemsList = Array.isArray(parsed) ? parsed : parsed.items
          if (!Array.isArray(itemsList)) {
            throw new Error('Unrecognized JSON format. Expected an array of items or { items: [...] }')
          }
          setParsedItems(itemsList)
          setImportStatus(`Loaded ${itemsList.length} items from JSON file.`)
        } else {
          // Assume CSV
          const csvItems = parseCSV(content)
          if (csvItems.length === 0) {
            throw new Error('No items could be extracted from this CSV file.')
          }
          setParsedItems(csvItems)
          setImportStatus(`Loaded ${csvItems.length} items from CSV file.`)
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse file.')
        setParsedItems([])
      }
    }
    reader.readAsText(file)
  }

  // Perform Batch Import
  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) return
    setIsProcessing(true)
    setImportError(null)
    try {
      const count = await importBatch(parsedItems)
      setImportStatus(`Successfully encrypted and imported ${count} items into your vault!`)
      setParsedItems([])
    } catch (err: any) {
      setImportError(err.message || 'Failed to import items.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Vault Import & Export
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Backup</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Data</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Decrypted JSON Vault Export</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Downloads an unencrypted JSON backup containing all your
                  logins, secure notes, TOTP secrets, and custom fields. Keep
                  this backup in a secure location.
                </p>
              </div>

              <button
                onClick={handleExportJSON}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Vault JSON Backup</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  Supported Import Formats
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload a standard <strong>.csv</strong> file (exported from
                  1Password, Bitwarden, LastPass, or Chrome) or a <strong>.json</strong> backup.
                </p>
              </div>

              {/* File Input */}
              <label className="block border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-950/50">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs text-slate-300 font-medium block">
                  Click to choose a CSV or JSON file
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Supports .csv and .json files
                </span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Status & Error Messages */}
              {importStatus && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-md flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-md flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Action Button */}
              {parsedItems.length > 0 && (
                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? 'Encrypting & Importing...'
                      : `Import ${parsedItems.length} Items into Vault`}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
