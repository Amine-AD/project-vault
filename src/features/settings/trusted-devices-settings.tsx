import { LaptopIcon, ShieldOffIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { toast } from '#/components/ui/toast'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { getErrorMessage } from '#/features/auth/utils'
import { forgetThisDevice, getDeviceId } from '#/lib/trusted-device'
import { listTrustedDevices, removeTrustedDevice } from '#/server/devices'
import { SettingRow, SettingsSection } from './components/setting-row'

type Device = Awaited<ReturnType<typeof listTrustedDevices>>[number]

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/**
 * Browsers that can recover the vault without the master password (with an
 * emailed code). Removing one takes that ability away.
 */
export function TrustedDevicesSettings() {
  const { user } = useVault()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Device | null>(null)
  const [trustOpen, setTrustOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [list, id] = await Promise.all([
        listTrustedDevices(),
        getDeviceId(user.email),
      ])
      setDevices(list)
      setThisDeviceId(id)
    } catch (err) {
      console.error('Failed to load trusted devices', err)
      setDevices([])
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const thisDeviceTrusted =
    !!thisDeviceId && !!devices?.some((d) => d.id === thisDeviceId)

  return (
    <SettingsSection
      title="Trusted devices"
      description="Browsers where you’ve unlocked your vault. If you forget your master password, any of them can recover it after a code sent to your email, so your items are kept."
    >
      {devices === null ? (
        <SettingRow
          description="Checking…"
          icon={<LaptopIcon />}
          title="Devices"
        />
      ) : (
        <>
          {!thisDeviceTrusted && (
            <SettingRow
              description="It can’t recover your vault if you forget your master password."
              icon={<ShieldOffIcon />}
              title="This browser isn’t trusted"
            >
              <Button onClick={() => setTrustOpen(true)} variant="outline">
                Trust this browser
              </Button>
            </SettingRow>
          )}
          {devices.map((device) => (
            <SettingRow
              description={`Added ${dateFormat.format(device.createdAt)} · Last unlocked ${dateFormat.format(device.lastUsedAt)}`}
              icon={<LaptopIcon />}
              key={device.id}
              title={device.name}
            >
              {device.id === thisDeviceId && (
                <Badge pill variant="success">
                  This browser
                </Badge>
              )}
              <Button onClick={() => setRemoving(device)} variant="ghost">
                Remove
              </Button>
            </SettingRow>
          ))}
        </>
      )}

      <RemoveDeviceDialog
        device={removing}
        isThisDevice={!!removing && removing.id === thisDeviceId}
        onClose={() => setRemoving(null)}
        onRemoved={load}
      />
      <TrustDeviceDialog
        onOpenChange={setTrustOpen}
        onTrusted={load}
        open={trustOpen}
      />
    </SettingsSection>
  )
}

function RemoveDeviceDialog({
  device,
  isThisDevice,
  onClose,
  onRemoved,
}: {
  device: Device | null
  isThisDevice: boolean
  onClose: () => void
  onRemoved: () => void
}) {
  const { user } = useVault()
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    if (!device || !user) return
    setBusy(true)
    try {
      await removeTrustedDevice({ data: { id: device.id } })
      // This browser also drops its key and stops re-trusting itself
      if (isThisDevice) await forgetThisDevice(user.email, { optOut: true })
      onClose()
      onRemoved()
      toast.success({ title: `${device.name} removed` })
    } catch (err) {
      toast.error({
        title: 'Could not remove the device',
        description: getErrorMessage(err, 'Try again.'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      onOpenChange={({ open }) => {
        if (!open) onClose()
      }}
      open={!!device}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader
          description={
            isThisDevice
              ? 'This browser won’t be able to recover your vault, and won’t be trusted again unless you turn it back on here.'
              : 'It won’t be able to recover your vault. If it’s still yours, it’s trusted again the next time you unlock your vault on it.'
          }
          title={
            isThisDevice
              ? 'Stop trusting this browser?'
              : `Remove ${device?.name ?? 'device'}?`
          }
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            isLoading={busy}
            onClick={remove}
            variant="destructive"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TrustDeviceDialog({
  open,
  onOpenChange,
  onTrusted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTrusted: () => void
}) {
  const { trustThisDevice } = useVault()
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
    <Dialog onOpenChange={({ open }) => close(open)} open={open}>
      <DialogContent size="sm">
        <form
          className="contents"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!password) return setError('Enter your master password.')
            setBusy(true)
            setError(null)
            try {
              await trustThisDevice(password)
              close(false)
              onTrusted()
              toast.success({ title: 'This browser is now trusted' })
            } catch (err) {
              setError(getErrorMessage(err, 'Could not trust this browser.'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader
            description="Only do this on your own device. Anyone who can use this browser and read your email could then recover your vault."
            title="Trust this browser"
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
            <Button isLoading={busy} type="submit">
              Trust browser
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
