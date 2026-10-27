import React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Shield,
  KeyRound,
  FileText,
  Star,
  Tag,
  Lock,
  LogOut,
  Key,
  Download,
  Clock,
  Settings,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'

interface SidebarProps {
  onOpenGenerator: () => void
  onOpenImportExport: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenGenerator,
  onOpenImportExport,
}) => {
  const {
    items,
    selectedTag,
    setSelectedTag,
    allTags,
    lockVault,
    handleLogout,
    user,
    autoLockMinutes,
    setAutoLockMinutes,
  } = useVault()

  const location = useLocation()
  const pathname = location.pathname

  const counts = {
    all: items.length,
    login: items.filter((i) => i.type === 'login').length,
    note: items.filter((i) => i.type === 'note').length,
    favorites: items.filter((i) => i.isFavorite).length,
  }

  const handleSelectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null)
    } else {
      setSelectedTag(tag)
    }
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0">
      {/* Brand & User Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 leading-tight">
              1Vault
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-[120px]">
              {user?.email || 'Local Vault'}
            </p>
          </div>
        </Link>

        <button
          onClick={lockVault}
          title="Lock Vault Now"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Categories */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div>
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Vault Categories
          </div>
          <nav className="space-y-0.5">
            <Link
              to="/app/all"
              onClick={() => setSelectedTag(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                (pathname === '/app/all' || pathname === '/app') && !selectedTag
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 shrink-0" />
                <span>All Items</span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded ${
                  (pathname === '/app/all' || pathname === '/app') && !selectedTag
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {counts.all}
              </span>
            </Link>

            <Link
              to="/app/logins"
              onClick={() => setSelectedTag(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/app/logins' && !selectedTag
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Logins</span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded ${
                  pathname === '/app/logins' && !selectedTag
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {counts.login}
              </span>
            </Link>

            <Link
              to="/app/notes"
              onClick={() => setSelectedTag(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/app/notes' && !selectedTag
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Secure Notes</span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded ${
                  pathname === '/app/notes' && !selectedTag
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {counts.note}
              </span>
            </Link>

            <Link
              to="/app/favorites"
              onClick={() => setSelectedTag(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/app/favorites' && !selectedTag
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Favorites</span>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded ${
                  pathname === '/app/favorites' && !selectedTag
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {counts.favorites}
              </span>
            </Link>
          </nav>
        </div>

        {/* Tags Section */}
        {allTags.length > 0 && (
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tags
            </div>
            <div className="space-y-0.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSelectTag(tag)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-slate-800 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tools Section */}
        <div>
          <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Utilities & Settings
          </div>
          <div className="space-y-0.5">
            <button
              onClick={onOpenGenerator}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Password Generator</span>
            </button>

            <button
              onClick={onOpenImportExport}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Import & Export</span>
            </button>

            <Link
              to="/app/settings"
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                pathname === '/app/settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Auto-Lock & Logout Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Auto-Lock</span>
          </div>
          <select
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            className="bg-slate-800 text-slate-200 text-[11px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value={1}>1 min</option>
            <option value={5}>5 mins</option>
            <option value={15}>15 mins</option>
            <option value={30}>30 mins</option>
            <option value={60}>1 hour</option>
            <option value={0}>Never</option>
          </select>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
