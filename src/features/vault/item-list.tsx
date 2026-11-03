import {
  ChevronDownIcon,
  FileTextIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  PlusIcon,
  SearchXIcon,
  StarIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '#/components/ui/item'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '#/components/ui/menu'
import { ScrollArea } from '#/components/ui/scroll-area'
import { SearchInput } from '#/components/ui/search-input'
import { SidebarTrigger } from '#/components/ui/sidebar'
import { useVault } from '#/context/VaultContext'
import { cn } from '#/lib/utils'
import type { DecryptedItem, ItemType } from '#/types/vault'
import { EmptyState } from './components/empty-state'
import { ItemIcon } from './components/item-icon'
import { getItemSubtitle } from './utils'

export function ItemList({ className }: { className?: string }) {
  const {
    filteredItems,
    searchQuery,
    setSearchQuery,
    setIsCreating,
    setCreateType,
    setIsEditing,
  } = useVault()

  const startCreate = (type: ItemType) => {
    setCreateType(type)
    setIsCreating(true)
    setIsEditing(false)
  }

  return (
    <section
      className={cn(
        'flex h-svh w-full shrink-0 flex-col border-e bg-sidebar md:w-80',
        className,
      )}
    >
      <header className="space-y-2 px-3 pt-3 pb-2">
        <div className="flex h-10 items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <SearchInput
            containerClassName="h-9 max-w-none flex-1 rounded-full"
            placeholder="Search vault"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            trailingAction={
              searchQuery ? (
                <Button
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  size="icon-xs"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              ) : undefined
            }
          />
          <Menu>
            <MenuTrigger asChild>
              <Button className="h-9 ps-3 pe-2.5">
                <PlusIcon />
                New
                <ChevronDownIcon className="opacity-70" />
              </Button>
            </MenuTrigger>
            <MenuContent className="w-44">
              <MenuItem value="login" onSelect={() => startCreate('login')}>
                <KeyRoundIcon />
                Login
              </MenuItem>
              <MenuItem value="note" onSelect={() => startCreate('note')}>
                <FileTextIcon />
                Secure note
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <p className="truncate px-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          {searchQuery && <> · “{searchQuery}”</>}
        </p>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {filteredItems.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={<SearchXIcon />}
              title="No matches"
              description="Try a different title, username or website."
            />
          ) : (
            <EmptyState
              icon={<LockKeyholeIcon />}
              title="Nothing here yet"
              description="Add a login or a secure note. It's encrypted before it leaves your browser."
              action={
                <Button onClick={() => startCreate('login')} size="sm">
                  <PlusIcon />
                  Add your first item
                </Button>
              }
            />
          )
        ) : (
          <ul className="flex flex-col gap-0.5 px-2 pb-2">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <ItemRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </section>
  )
}

function ItemRow({ item }: { item: DecryptedItem }) {
  const {
    selectedId,
    setSelectedId,
    setIsCreating,
    setIsEditing,
    toggleFavorite,
  } = useVault()
  const isSelected = item.id === selectedId

  return (
    <Item
      className={cn(
        'flex-nowrap gap-2 rounded-2xl border border-transparent p-1.5 pe-2 transition-colors',
        isSelected
          ? 'border-border bg-background shadow-xs/5'
          : 'hover:bg-sidebar-accent',
      )}
    >
      <button
        aria-current={isSelected || undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/32"
        onClick={() => {
          setSelectedId(item.id)
          setIsCreating(false)
          setIsEditing(false)
        }}
        type="button"
      >
        <ItemMedia>
          <ItemIcon
            title={item.title}
            type={item.type}
            url={item.type === 'login' ? item.url : undefined}
          />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="w-full truncate font-medium">
            {item.title || 'Untitled'}
          </ItemTitle>
          <ItemDescription className="truncate text-xs">
            {getItemSubtitle(item)}
          </ItemDescription>
        </ItemContent>
      </button>
      <ItemActions>
        <Button
          aria-label={
            item.isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }
          aria-pressed={item.isFavorite}
          className={cn(
            item.isFavorite
              ? 'text-warning'
              : 'text-muted-foreground opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100',
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(item.id)
          }}
          size="icon-xs"
          variant="ghost"
        >
          <StarIcon fill={item.isFavorite ? 'currentColor' : 'none'} />
        </Button>
      </ItemActions>
    </Item>
  )
}
