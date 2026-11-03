import { LifeBuoyIcon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { getErrorMessage } from '#/features/auth/utils'
import { cn } from '#/lib/utils'
import { SettingRow, SettingsSection } from './components/setting-row'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function RecoveryKitSettings() {
  const { recoveryCreatedAt } = useVault()
  const [open, setOpen] = useState(false)
  const hasKit = typeof recoveryCreatedAt === 'number'
  const loading = recoveryCreatedAt === undefined

  return (
    <SettingsSection
      title="Recovery kit"
      description="Your way back in if you forget your master password."
    >
      <SettingRow
        description={
          loading
            ? 'Checking…'
            : hasKit
              ? `Created ${dateFormat.format(recoveryCreatedAt)}. Making a new one stops the old key from working.`
              : 'Without one, a forgotten master password means your vault is gone for good.'
        }
        icon={hasKit || loading ? <LifeBuoyIcon /> : <TriangleAlertIcon />}
        title={hasKit ? 'Recovery key active' : 'No recovery key yet'}
      >
        <Button
          disabled={loading}
          onClick={() => setOpen(true)}
          variant={hasKit ? 'outline' : 'default'}
        >
          {hasKit ? 'Create new kit' : 'Create recovery kit'}
        </Button>
      </SettingRow>

      <ConfirmPasswordDialog
        onOpenChange={setOpen}
        open={open}
        replacing={hasKit}
      />
    </SettingsSection>
  )
}

function ConfirmPasswordDialog({
  open,
  onOpenChange,
  replacing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  replacing: boolean
}) {
  const { createRecoveryKit } = useVault()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setPassword('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={({ open }) => close(open)}>
      <DialogContent size="sm">
        <form
          className="contents"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!password) return setError('Enter your master password.')
            setBusy(true)
            setError(null)
            try {
              await createRecoveryKit(password)
              // The kit itself appears in the recovery kit dialog
              close(false)
            } catch (err) {
              setError(getErrorMessage(err, 'Could not create a recovery kit.'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader
            description={
              replacing
                ? 'Your current recovery key will stop working once the new one is created.'
                : 'Confirm it’s you. Your new key is shown once, so have somewhere ready to save it.'
            }
            title={
              replacing
                ? 'Create a new recovery kit'
                : 'Create your recovery kit'
            }
          />
          <DialogBody className="space-y-4">
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
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => close(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              className={cn(replacing && 'px-5')}
              isLoading={busy}
              type="submit"
            >
              {replacing ? 'Replace kit' : 'Create kit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
