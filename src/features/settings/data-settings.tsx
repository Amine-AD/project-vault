import { DownloadIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
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
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { getErrorMessage } from '#/features/auth/utils'
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
            Argon2id · 64 MiB
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
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isErasing, setIsErasing] = useState(false)

  const confirmed = phrase === CONFIRM_PHRASE

  const reset = () => {
    setPassword('')
    setPhrase('')
    setError(null)
  }

  const handleErase = async () => {
    if (!password) return setError('Enter your master password.')
    if (!confirmed) return setError(`Type ${CONFIRM_PHRASE} to confirm.`)
    setIsErasing(true)
    setError(null)
    try {
      await eraseAllItems(password)
      setOpen(false)
      reset()
      toast.success({ title: 'Vault erased' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not erase your items.'))
    } finally {
      setIsErasing(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={({ open }) => {
        setOpen(open)
        if (!open) reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button disabled={items.length === 0} variant="destructive">
          <Trash2Icon />
          Erase all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            handleErase()
          }}
        >
          <AlertDialogHeader
            title={
              items.length === 1
                ? 'Erase your only item?'
                : `Erase all ${items.length} items?`
            }
            description="Every login, note, password and custom field is deleted from the database. This can't be undone."
          />
          <AlertDialogBody className="space-y-4">
            <FormAlert message={error} />
            <Field>
              <FieldLabel>Master password</FieldLabel>
              <MasterPasswordInput
                autoComplete="current-password"
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
            </Field>
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
                spellCheck={false}
                value={phrase}
              />
            </Field>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              disabled={!confirmed || !password}
              isLoading={isErasing}
              type="submit"
              variant="destructive"
            >
              Erase everything
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
