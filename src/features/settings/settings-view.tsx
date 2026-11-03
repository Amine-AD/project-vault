import { DatabaseIcon, ShieldIcon, UserIcon } from 'lucide-react'
import { ScrollArea } from '#/components/ui/scroll-area'
import { SidebarTrigger } from '#/components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { AccountSettings } from './account-settings'
import { DataSettings } from './data-settings'
import { SecuritySettings } from './security-settings'

const TABS = [
  {
    value: 'security',
    label: 'Security',
    icon: ShieldIcon,
    Panel: SecuritySettings,
  },
  { value: 'data', label: 'Data', icon: DatabaseIcon, Panel: DataSettings },
  {
    value: 'account',
    label: 'Account',
    icon: UserIcon,
    Panel: AccountSettings,
  },
] as const

export function SettingsView() {
  return (
    <ScrollArea className="h-svh flex-1 bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6 md:p-10">
        <header className="flex items-start gap-2">
          <SidebarTrigger className="-ms-2 md:hidden" />
          <div className="space-y-1">
            <h1 className="font-display font-semibold text-2xl tracking-tight md:text-3xl">
              Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Security, backups and preferences for your vault.
            </p>
          </div>
        </header>

        <Tabs defaultValue="security">
          <TabsList className="w-full overflow-x-auto rounded-full [&_[data-slot=tab-indicator]]:rounded-full">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                className="flex-1 rounded-full"
                key={value}
                value={value}
              >
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(({ value, Panel }) => (
            <TabsContent className="pt-6" key={value} value={value}>
              <Panel />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </ScrollArea>
  )
}
