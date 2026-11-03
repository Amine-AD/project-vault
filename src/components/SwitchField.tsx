import { Field, FieldDescription, FieldLabel } from './ui/field'
import { Switch } from './ui/switch'

interface SwitchFieldProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/** A labelled Shark UI Switch laid out as a settings row. */
export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SwitchFieldProps) {
  return (
    <Field
      orientation="horizontal"
      className="justify-between gap-4"
      disabled={disabled}
    >
      <div className="flex flex-col gap-0.5">
        <FieldLabel className="font-normal">{label}</FieldLabel>
        {description && (
          <FieldDescription className="text-xs">{description}</FieldDescription>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={({ checked }) => onCheckedChange(checked)}
      />
    </Field>
  )
}
