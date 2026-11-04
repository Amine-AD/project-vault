import { LockIcon, LogOutIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DataList,
  DataListItem,
  DataListItemLabel,
  DataListItemValue,
} from '#/components/ui/data-list'
import { useVault } from '#/context/VaultContext'
import { SettingsSection } from './components/setting-row'
import { DeleteAccountSettings } from './delete-account'

export function AccountSettings() {
  return (
    <div className="space-y-8">
      <AccountDetails />
      <DeleteAccountSettings />
    </div>
  )
}

function AccountDetails() {
  const { user, lockVault, handleLogout } = useVault()

  return (
    <SettingsSection
      title="Account"
      description="The account this vault belongs to."
    >
      <div className="space-y-5 p-5">
        <DataList>
          <DataListItem>
            <DataListItemLabel>Email</DataListItemLabel>
            <DataListItemValue className="font-medium">
              {user?.email}
            </DataListItemValue>
          </DataListItem>
          <DataListItem>
            <DataListItemLabel>Account ID</DataListItemLabel>
            <DataListItemValue className="truncate font-mono text-muted-foreground text-xs">
              {user?.id}
            </DataListItemValue>
          </DataListItem>
          <DataListItem>
            <DataListItemLabel>Status</DataListItemLabel>
            <DataListItemValue>
              <Badge variant="success" pill>
                Unlocked
              </Badge>
            </DataListItemValue>
          </DataListItem>
        </DataList>
        <div className="flex flex-wrap gap-2">
          <Button onClick={lockVault} variant="outline">
            <LockIcon />
            Lock vault
          </Button>
          <Button onClick={handleLogout} variant="destructive">
            <LogOutIcon />
            Sign out
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
