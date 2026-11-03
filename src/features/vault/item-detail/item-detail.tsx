import { ArrowLeftIcon, KeyRoundIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { ScrollArea } from '#/components/ui/scroll-area'
import { useVault } from '#/context/VaultContext'
import { cn } from '#/lib/utils'
import { EmptyState } from '../components/empty-state'
import { ItemForm } from './item-form'
import { ItemView } from './item-view'

export function ItemDetail({ className }: { className?: string }) {
  const {
    selectedItem,
    isCreating,
    isEditing,
    createType,
    setSelectedId,
    setIsCreating,
    setIsEditing,
  } = useVault()

  let content: React.ReactNode
  if (isCreating) {
    content = <ItemForm key={`new-${createType}`} type={createType} />
  } else if (selectedItem && isEditing) {
    content = (
      <ItemForm
        key={`edit-${selectedItem.id}`}
        item={selectedItem}
        type={selectedItem.type}
      />
    )
  } else if (selectedItem) {
    content = <ItemView key={selectedItem.id} item={selectedItem} />
  } else {
    content = (
      <EmptyState
        className="min-h-svh"
        icon={<KeyRoundIcon />}
        title="No item selected"
        description="Pick something from the list, or create a new login or secure note."
      />
    )
  }

  return (
    <div
      className={cn(
        'flex h-svh min-w-0 flex-1 flex-col bg-background',
        className,
      )}
    >
      {/* On small screens the list and the detail take turns */}
      <div className="border-b p-2 md:hidden">
        <Button
          onClick={() => {
            setSelectedId(null)
            setIsCreating(false)
            setIsEditing(false)
          }}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon />
          Back
        </Button>
      </div>
      <ScrollArea className="flex-1">{content}</ScrollArea>
    </div>
  )
}
