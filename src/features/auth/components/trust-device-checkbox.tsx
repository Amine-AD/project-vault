import { useId } from 'react'
import { Checkbox } from '#/components/ui/checkbox'

/**
 * "Trust this device" choice shown wherever signing in sets up this browser.
 * A trusted browser can recover the vault (with an emailed code) if the
 * master password is forgotten, so it should stay off on shared computers.
 */
export function TrustDeviceCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const hintId = useId()

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        aria-describedby={hintId}
        aria-label="Trust this device"
        checked={checked}
        className="mt-0.5"
        onCheckedChange={(details) => onCheckedChange(details.checked === true)}
      />
      <div className="grid gap-0.5">
        <button
          className="text-start font-medium text-sm"
          onClick={() => onCheckedChange(!checked)}
          type="button"
        >
          Trust this device
        </button>
        <p className="text-muted-foreground text-xs" id={hintId}>
          Lets this browser recover your vault if you forget your master
          password. Turn off on shared or public computers.
        </p>
      </div>
    </div>
  )
}
