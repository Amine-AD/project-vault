import { Link, useLocation } from '@tanstack/react-router'
import {
  ChevronsUpDownIcon,
  FileTextIcon,
  HashIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  LockIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
} from 'lucide-react'
import { BrandLogo } from '#/components/BrandLogo'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '#/components/ui/menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import { useVault } from '#/context/VaultContext'
import { type Theme, useTheme } from '#/lib/theme'

interface AppSidebarProps {
  onOpenGenerator: () => void
}

const CATEGORIES = [
  { to: '/app/all', label: 'All items', icon: LayoutGridIcon, key: 'all' },
  { to: '/app/logins', label: 'Logins', icon: KeyRoundIcon, key: 'login' },
  { to: '/app/notes', label: 'Secure notes', icon: FileTextIcon, key: 'note' },
  {
    to: '/app/favorites',
    label: 'Favorites',
    icon: StarIcon,
    key: 'favorites',
  },
] as const

/** Active nav item: an ink pill, like the knob of the appearance switch. */
const NAV_BUTTON =
  'h-9 rounded-full px-3 data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:font-medium'

/** Counts sit on the pill when active, so they flip to the pill's ink. */
const NAV_BADGE =
  'end-2.5 font-mono text-[11px] tabular-nums peer-data-[active=true]/menu-button:text-background/70'

const GROUP_LABEL =
  'px-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]'

export function AppSidebar({ onOpenGenerator }: AppSidebarProps) {
  const { items, allTags, selectedTag, setSelectedTag, lockVault } = useVault()
  const pathname = useLocation({ select: (l) => l.pathname })

  const counts = {
    all: items.length,
    login: items.filter((i) => i.type === 'login').length,
    note: items.filter((i) => i.type === 'note').length,
    favorites: items.filter((i) => i.isFavorite).length,
  }

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex-row items-center justify-between px-4">
        <Link to="/" className="rounded-lg outline-none">
          <BrandLogo size="sm" />
        </Link>
        <Button
          onClick={lockVault}
          size="sm"
          title="Lock vault: clears your key from memory"
          variant="outline"
        >
          <LockIcon />
          Lock
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>Vault</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {CATEGORIES.map(({ to, label, icon: Icon, key }) => (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  asChild
                  className={NAV_BUTTON}
                  isActive={pathname === to && !selectedTag}
                >
                  <Link to={to} onClick={() => setSelectedTag(null)}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge className={NAV_BADGE}>
                  {counts[key]}
                </SidebarMenuBadge>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {allTags.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={GROUP_LABEL}>Tags</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {allTags.map((tag) => (
                <SidebarMenuItem key={tag}>
                  <SidebarMenuButton
                    className={NAV_BUTTON}
                    isActive={selectedTag === tag}
                    onClick={() =>
                      setSelectedTag(selectedTag === tag ? null : tag)
                    }
                  >
                    <HashIcon />
                    <span>{tag}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className={NAV_BADGE}>
                    {items.filter((i) => i.tags.includes(tag)).length}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className={GROUP_LABEL}>Tools</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                className={NAV_BUTTON}
                onClick={onOpenGenerator}
              >
                <SparklesIcon />
                <span>Password generator</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={NAV_BUTTON}
                isActive={pathname === '/app/settings'}
              >
                <Link to="/app/settings">
                  <SettingsIcon />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t p-2">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

function UserMenu() {
  const { user, lockVault, handleLogout } = useVault()
  const { theme, setTheme } = useTheme()
  const email = user?.email ?? ''

  return (
    <Menu positioning={{ placement: 'top-start', sameWidth: true }}>
      <MenuTrigger asChild>
        <Button
          className="h-12 w-full justify-start gap-2.5 rounded-xl px-2"
          variant="ghost"
        >
          <Avatar size="sm" className="rounded-full">
            <AvatarFallback className="bg-primary font-semibold text-[11px] text-white">
              {email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col text-start">
            <span className="truncate font-medium text-sm">{email}</span>
            <span className="font-normal text-muted-foreground text-xs">
              Vault unlocked
            </span>
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuRadioGroup
          heading="Appearance"
          onValueChange={({ value }) => setTheme(value as Theme)}
          value={theme ?? undefined}
        >
          <MenuRadioItem value="light">
            <span className="flex items-center gap-2">
              <SunIcon />
              Light
            </span>
          </MenuRadioItem>
          <MenuRadioItem value="dark">
            <span className="flex items-center gap-2">
              <MoonIcon />
              Dark
            </span>
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem value="lock" onSelect={lockVault}>
          <LockIcon />
          Lock vault
        </MenuItem>
        <MenuItem value="settings" asChild>
          <Link to="/app/settings">
            <SettingsIcon />
            Settings
          </Link>
        </MenuItem>
        <MenuSeparator />
        <MenuItem value="logout" variant="destructive" onSelect={handleLogout}>
          <LogOutIcon />
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
