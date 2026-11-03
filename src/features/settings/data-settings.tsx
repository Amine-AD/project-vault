import { DownloadIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toast } from '#/components/ui/toast'
import { useVault } from '#/context/VaultContext'
import { ImportExportDialog } from '#/features/vault/import-export-dialog'
import { downloadJson, todayStamp } from '#/features/vault/utils'
import { SettingRow, SettingsSection } from './components/setting-row'

const CONFIRM_PHRASE = 'ERASE ALL'

export function DataSettings() {
  const { items, exportDecryptedJSON } = useVault()
  const [importOpen, setImportOpen] = useState(false)

  const stats = [
    { label: 'Total items', value: items.length },
    { label: 'Logins', value: items.filter((i) => i.type === 'login').length },
    {
      label: 'Secure notes',
      value: items.filter((i) => i.type === 'note').length,
    },
    { label: 'Favorites', value: items.filter((i) => i.isFavorite).length },
  ]

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              className="rounded-2xl border bg-card p-4 shadow-xs/5"
              key={s.label}
            >
              <div className="text-muted-foreground text-xs">{s.label}</div>
              <div className="mt-1 font-display font-semibold text-2xl">
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 px-1">
          <Badge variant="outline" pill>
            AES-256-GCM
          </Badge>
          <Badge variant="outline" pill>
            PBKDF2 · 600,000 rounds
          </Badge>
          <Badge variant="outline" pill>
            Zero-knowledge
          </Badge>
        </div>
      </section>

      <SettingsSection
        title="Backup & migration"
        description="Move your data in and out of OneVault."
      >
        <SettingRow
          icon={<DownloadIcon />}
          title="Export as JSON"
          description="A plain-text backup of every item. Keep it somewhere safe."
        >
          <Button
            onClick={() =>
              downloadJson(
                exportDecryptedJSON(),
                `onevault-backup-${todayStamp()}.json`,
              )
            }
            variant="outline"
          >
            Download
          </Button>
        </SettingRow>
        <SettingRow
          icon={<UploadIcon />}
          title="Import CSV or JSON"
          description="From 1Password, Bitwarden, LastPass, Chrome or a OneVault backup."
        >
          <Button onClick={() => setImportOpen(true)} variant="outline">
            Import
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Danger zone" className="border-destructive/30">
        <SettingRow
          title="Erase all items"
          description="Permanently delete every login and note in this vault."
        >
          <EraseAllButton />
        </SettingRow>
      </SettingsSection>

      <ImportExportDialog
        defaultTab="import"
        onOpenChange={setImportOpen}
        open={importOpen}
      />
    </div>
  )
}

function EraseAllButton() {
  const { items, eraseAllItems } = useVault()
  const [open, setOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [isErasing, setIsErasing] = useState(false)

  const handleErase = async () => {
    setIsErasing(true)
    try {
      await eraseAllItems()
      setOpen(false)
      toast.success({ title: 'Vault erased' })
    } catch (error) {
      toast.error({
        title: 'Could not erase items',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsErasing(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={({ open }) => {
        setOpen(open)
        if (!open) setPhrase('')
      }}
    >
      <AlertDialogTrigger asChild>
        <Button disabled={items.length === 0} variant="destructive">
          <Trash2Icon />
          Erase all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader
          title={
            items.length === 1
              ? 'Erase your only item?'
              : `Erase all ${items.length} items?`
          }
          description="Every login, note, password and custom field is deleted from the database. This can't be undone."
        />
        <AlertDialogBody>
          <Field>
            <FieldLabel>
              Type{' '}
              <span className="font-mono text-destructive">
                {CONFIRM_PHRASE}
              </span>{' '}
              to confirm
            </FieldLabel>
            <Input
              autoComplete="off"
              className="font-mono"
              onChange={(e) => setPhrase(e.target.value)}
              value={phrase}
            />
          </Field>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={phrase !== CONFIRM_PHRASE}
            isLoading={isErasing}
            onClick={handleErase}
            variant="destructive"
          >
            Erase everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
