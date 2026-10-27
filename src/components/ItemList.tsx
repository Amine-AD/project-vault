import React, { useState } from 'react'
import {
  Search,
  X,
  Plus,
  KeyRound,
  FileText,
  Star,
  ChevronDown,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'
import type { DecryptedItem, ItemType } from '../types/vault'

export const ItemList: React.FC = () => {
  const {
    filteredItems,
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    setIsCreating,
    setCreateType,
    setIsEditing,
  } = useVault()

  const [showAddMenu, setShowAddMenu] = useState(false)

  const handleStartCreate = (type: ItemType) => {
    setCreateType(type)
    setIsCreating(true)
    setIsEditing(false)
    setShowAddMenu(false)
  }

  const handleSelectItem = (item: DecryptedItem) => {
    setSelectedId(item.id)
    setIsCreating(false)
    setIsEditing(false)
  }

  return (
    <section className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Search & Add Header */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* New Item Button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-800 rounded-md shadow-xl py-1 z-30">
                  <button
                    onClick={() => handleStartCreate('login')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>New Login</span>
                  </button>
                  <button
                    onClick={() => handleStartCreate('note')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Secure Note</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Count summary */}
        <div className="text-[11px] text-slate-500 font-medium px-1 flex justify-between items-center">
          <span>{filteredItems.length} items</span>
          {searchQuery && (
            <span className="text-blue-400">Filtered by "{searchQuery}"</span>
          )}
        </div>
      </div>

      {/* Item Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {searchQuery ? (
              <p>No matching vault items found.</p>
            ) : (
              <div className="space-y-2">
                <p>Your vault is empty.</p>
                <button
                  onClick={() => handleStartCreate('login')}
                  className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Add your first item
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = item.id === selectedId
            const isLogin = item.type === 'login'
            const subtitle = isLogin
              ? item.username || (item.url ? new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`).hostname : '') || 'No username'
              : item.notes?.slice(0, 30) || 'Empty note'

            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`group px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors relative ${
                  isSelected
                    ? 'bg-slate-800/90 text-slate-100'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
                }`}
              >
                {/* Active indicator bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                )}

                {/* Category Icon */}
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isLogin
                      ? 'bg-blue-950/60 text-blue-400 border border-blue-900/50'
                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                  }`}
                >
                  {isLogin ? (
                    <KeyRound className="w-3.5 h-3.5" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Title & Subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {item.title || 'Untitled'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {subtitle}
                  </div>
                </div>

                {/* Favorite Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(item.id)
                  }}
                  className={`p-1 rounded transition-colors ${
                    item.isFavorite
                      ? 'text-amber-400 opacity-100'
                      : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-400'
                  }`}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={item.isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
