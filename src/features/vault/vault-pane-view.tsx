import { useEffect } from 'react'
import { useVault } from '#/context/VaultContext'
import { ItemDetail } from './item-detail/item-detail'
import { ItemList } from './item-list'

export type VaultCategory = 'all' | 'login' | 'note' | 'favorites'

export function VaultPaneView({ category }: { category: VaultCategory }) {
  const {
    setSelectedCategory,
    setSelectedTag,
    selectedItem,
    isCreating,
    isEditing,
  } = useVault()

  useEffect(() => {
    setSelectedCategory(category)
    setSelectedTag(null)
  }, [category, setSelectedCategory, setSelectedTag])

  const showDetail = !!selectedItem || isCreating || isEditing

  return (
    <div className="flex flex-1 overflow-hidden">
      <ItemList className={showDetail ? 'hidden md:flex' : undefined} />
      <ItemDetail className={showDetail ? undefined : 'hidden md:flex'} />
    </div>
  )
}
