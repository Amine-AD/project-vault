import { ArchiveRestoreIcon, LockIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { toast } from '#/components/ui/toast'
import { type LockedVaultMethod, useVault } from '#/context/VaultContext'
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { getErrorMessage } from '#/features/auth/utils'
import { getDeviceId } from '#/lib/trusted-device'
import { listLockedVaults } from '#/server/locked-vaults'
import { SettingRow, SettingsSection } from './components/setting-row'

type LockedVault = Awaited<ReturnType<typeof listLockedVaults>>[number]
type MethodKind = LockedVaultMethod['kind']

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

const itemsLabel = (count: number) =>
  `${count} ${count === 1 ? 'item' : 'items'}`

/**
 * Vaults set aside by "Start a new vault" during recovery. Shown only when
 * there is one. Restoring needs the old master password, the old recovery
 * key, or this browser if it was trusted before the reset.
 */
export function LockedVaultsSettings() {
  const { user } = useVault()
  const [vaults, setVaults] = useState<LockedVault[]>([])
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<LockedVault | null>(null)
  const [deleting, setDeleting] = useState<LockedVault | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [list, id] = await Promise.all([
        listLockedVaults(),
        getDeviceId(user.email),
      ])
      setVaults(list)
      setThisDeviceId(id)
    } catch (err) {
      console.error('Failed to load locked vaults', err)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (vaults.length === 0) return null

  return (
    <SettingsSection
      className="border-warning/40"
      description="Items set aside when you started a new vault without your recovery key. They’re still encrypted with your old master password, so only it, your old recovery key or a browser trusted back then can open them."
      title="Locked items"
    >
      {vaults.map((vault) => (
        <SettingRow
          description={`Locked ${dateFormat.format(vault.lockedAt)}`}
          icon={<LockIcon />}
          key={vault.id}
          title={`${itemsLabel(vault.itemCount)} from your old vault`}
        >
          <Button
            aria-label="Delete locked items"
            onClick={() => setDeleting(vault)}
            size="icon-md"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
          <Button onClick={() => setRestoring(vault)}>
            <ArchiveRestoreIcon />
            Restore
          </Button>
        </SettingRow>
      ))}

      <RestoreDialog
        canUseDevice={
          !!restoring &&
          !!thisDeviceId &&
          restoring.deviceIds.includes(thisDeviceId)
        }
        onClose={() => setRestoring(null)}
        onRestored={load}
        vault={restoring}
      />
      <DeleteDialog
        onClose={() => setDeleting(null)}
        onDeleted={load}
        vault={deleting}
      />
    </SettingsSection>
  )
}

const METHOD_LABELS: Record<MethodKind, string> = {
  password: 'Old password',
  recoveryKey: 'Old recovery key',
  device: 'This browser',
}

function RestoreDialog({
  vault,
  canUseDevice,
  onClose,
  onRestored,
}: {
  vault: LockedVault | null
  canUseDevice: boolean
  onClose: () => void
  onRestored: () => void
}) {
  const { restoreLockedVault } = useVault()
  const [kind, setKind] = useState<MethodKind>('password')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Default to this browser when it can open the vault: no typing needed
  useEffect(() => {
    if (vault) setKind(canUseDevice ? 'device' : 'password')
  }, [vault, canUseDevice])

  const kinds: MethodKind[] = [
    ...(canUseDevice ? (['device'] as const) : []),
    'password',
    ...(vault?.hasRecoveryKey ? (['recoveryKey'] as const) : []),
  ]

  const close = () => {
    onClose()
    setSecret('')
    setError(null)
  }

  const submit = async () => {
    if (!vault) return
    if (kind !== 'device' && !secret.trim()) {
      return setError(
        kind === 'password'
          ? 'Enter the master password you used before the reset.'
          : 'Enter your old recovery key.',
      )
    }
    const method: LockedVaultMethod =
      kind === 'device'
        ? { kind }
        : kind === 'password'
          ? { kind, password: secret }
          : { kind, recoveryKey: secret }

    setBusy(true)
    setError(null)
    try {
      const count = await restoreLockedVault(vault, method)
      close()
      onRestored()
      toast.success({
        title: `${itemsLabel(count)} restored`,
        description:
          'They’re back in your vault, encrypted with your current master password.',
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not restore these items.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      onOpenChange={({ open }) => {
        if (!open) close()
      }}
      open={!!vault}
    >
      <DialogContent size="sm">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <DialogHeader
            description="Prove it’s your old vault. Everything is decrypted and re-encrypted in your browser."
            title={`Restore ${itemsLabel(vault?.itemCount ?? 0)}`}
          />
          <DialogBody className="space-y-4">
            {kinds.length > 1 && (
              <Tabs
                onValueChange={({ value }) => {
                  setKind(value as MethodKind)
                  setSecret('')
                  setError(null)
                }}
                value={kind}
              >
                <TabsList className="w-full">
                  {kinds.map((k) => (
                    <TabsTrigger className="flex-1" key={k} value={k}>
                      {METHOD_LABELS[k]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <FormAlert message={error} />
            {kind === 'device' && (
              <p className="text-muted-foreground text-sm">
                This browser was trusted before the reset, so it can open these
                items without a password.
              </p>
            )}
            {kind === 'password' && (
              <Field>
                <FieldLabel>Master password before the reset</FieldLabel>
                <MasterPasswordInput
                  autoComplete="off"
                  autoFocus
                  onChange={(e) => setSecret(e.target.value)}
                  value={secret}
                />
              </Field>
            )}
            {kind === 'recoveryKey' && (
              <Field>
                <FieldLabel>Recovery key before the reset</FieldLabel>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoFocus
                  className="font-mono uppercase tracking-wide"
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="OV-XXXX-XXXX-XXXX-…"
                  spellCheck={false}
                  value={secret}
                />
              </Field>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={close} variant="ghost">
              Cancel
            </Button>
            <Button isLoading={busy} type="submit">
              Restore items
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  vault,
  onClose,
  onDeleted,
}: {
  vault: LockedVault | null
  onClose: () => void
  onDeleted: () => void
}) {
  const { deleteLockedVault } = useVault()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setPassword('')
    setError(null)
    onClose()
  }

  const remove = async () => {
    if (!vault) return
    if (!password) return setError('Enter your master password.')
    setBusy(true)
    setError(null)
    try {
      await deleteLockedVault(vault.id, password)
      close()
      onDeleted()
      toast.success({ title: 'Locked items deleted' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete these items.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      onOpenChange={({ open }) => {
        if (!open) close()
      }}
      open={!!vault}
    >
      <AlertDialogContent size="sm">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            remove()
          }}
        >
          <AlertDialogHeader
            description="If you ever find your old master password or recovery key, these items would be gone for good. This can’t be undone."
            title={`Delete ${itemsLabel(vault?.itemCount ?? 0)} for good?`}
          />
          <AlertDialogBody className="space-y-4">
            <FormAlert message={error} />
            <Field>
              <FieldLabel>Your current master password</FieldLabel>
              <MasterPasswordInput
                autoComplete="current-password"
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
            </Field>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <Button
              disabled={!password}
              isLoading={busy}
              type="submit"
              variant="destructive"
            >
              Delete for good
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
