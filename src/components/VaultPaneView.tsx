import { useEffect } from 'react'
import { useVault } from '../context/VaultContext'
import { ItemList } from './ItemList'
import { ItemDetail } from './ItemDetail'

interface VaultPaneViewProps {
  category: 'all' | 'login' | 'note' | 'favorites'
}

export function VaultPaneView({ category }: VaultPaneViewProps) {
  const { setSelectedCategory, setSelectedTag } = useVault()

  useEffect(() => {
    setSelectedCategory(category)
    setSelectedTag(null)
  }, [category, setSelectedCategory, setSelectedTag])

  return (
    <div className="flex-1 flex overflow-hidden">
      <ItemList />
      <ItemDetail />
    </div>
  )
}
