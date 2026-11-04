import { useNavigate } from '@tanstack/react-router'
import { DownloadIcon, Trash2Icon } from 'lucide-react'
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
import { Button } from '#/components/ui/button'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toast } from '#/components/ui/toast'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { getErrorMessage } from '#/features/auth/utils'
import { downloadJson, todayStamp } from '#/features/vault/utils'
import { SettingRow, SettingsSection } from './components/setting-row'

const CONFIRM_WORD = 'DELETE'

/**
 * Danger zone on the Account tab: permanently deletes the account. Asks for
 * the master password and a typed confirmation, and offers a backup first.
 */
export function DeleteAccountSettings() {
  return (
    <SettingsSection className="border-destructive/30" title="Danger zone">
      <SettingRow
        description="Permanently delete your account, every item, locked items, trusted devices and your recovery kit."
        title="Delete account"
      >
        <DeleteAccountDialog />
      </SettingRow>
    </SettingsSection>
  )
}

function DeleteAccountDialog() {
  const { items, exportDecryptedJSON, deleteAccount } = useVault()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const confirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD

  const reset = () => {
    setPassword('')
    setConfirmText('')
    setError(null)
  }

  const submit = async () => {
    if (!password) return setError('Enter your master password.')
    if (!confirmed) return setError(`Type ${CONFIRM_WORD} to confirm.`)
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password, async () => {
        await navigate({ to: '/', replace: true })
      })
      toast.success({
        title: 'Your account was deleted',
        description: 'Everything in it is gone. Thanks for trying OneVault.',
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete your account.'))
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      onOpenChange={({ open }) => {
        setOpen(open)
        if (!open) reset()
      }}
      open={open}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2Icon />
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <AlertDialogHeader
            description="Your account and everything in it are deleted right away. Nobody can bring them back, including us."
            title="Delete your account?"
          />
          <AlertDialogBody className="space-y-4">
            {items.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">
                  Keep a copy of your {items.length}{' '}
                  {items.length === 1 ? 'item' : 'items'}?
                </span>
                <Button
                  onClick={() =>
                    downloadJson(
                      exportDecryptedJSON(),
                      `onevault-backup-${todayStamp()}.json`,
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <DownloadIcon />
                  Download backup
                </Button>
              </div>
            )}

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
                  {CONFIRM_WORD}
                </span>{' '}
                to confirm
              </FieldLabel>
              <Input
                autoCapitalize="characters"
                autoComplete="off"
                className="font-mono uppercase"
                onChange={(e) => setConfirmText(e.target.value)}
                spellCheck={false}
                value={confirmText}
              />
            </Field>
          </AlertDialogBody>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              disabled={!confirmed || !password}
              isLoading={busy}
              type="submit"
              variant="destructive"
            >
              Delete account forever
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
