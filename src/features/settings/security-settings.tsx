import { revalidateLogic, useForm } from '@tanstack/react-form'
import { ClipboardCheckIcon, TimerIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { toast } from '#/components/ui/toast'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from '#/features/auth/components/form-alert'
import { MasterPasswordInput } from '#/features/auth/components/master-password-input'
import { MASTER_PASSWORD_MIN_LENGTH } from '#/features/auth/schemas'
import { getErrorMessage, getFieldErrorText } from '#/features/auth/utils'
import { SettingRow, SettingsSection } from './components/setting-row'
import { RecoveryKitSettings } from './recovery-kit-settings'

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
]

const CLIPBOARD_OPTIONS = [
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 0, label: 'Never' },
]

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current master password'),
    newPassword: z
      .string()
      .min(
        MASTER_PASSWORD_MIN_LENGTH,
        `Use at least ${MASTER_PASSWORD_MIN_LENGTH} characters`,
      ),
    confirmPassword: z.string().min(1, 'Confirm your new master password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function SecuritySettings() {
  const {
    autoLockMinutes,
    setAutoLockMinutes,
    clipboardClearSeconds,
    setClipboardClearSeconds,
  } = useVault()

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Protection"
        description="Safeguards for when you step away from your device."
      >
        <SettingRow
          icon={<TimerIcon />}
          title="Auto-lock"
          description="Lock the vault and clear keys from memory after inactivity."
        >
          <NativeSelect
            aria-label="Auto-lock after"
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            value={autoLockMinutes}
          >
            {AUTO_LOCK_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </SettingRow>
        <SettingRow
          icon={<ClipboardCheckIcon />}
          title="Clear clipboard"
          description="Wipe copied passwords from the clipboard after a delay."
        >
          <NativeSelect
            aria-label="Clear clipboard after"
            onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
            value={clipboardClearSeconds}
          >
            {CLIPBOARD_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </SettingRow>
      </SettingsSection>

      <RecoveryKitSettings />

      <SettingsSection
        title="Change master password"
        description="Derives a new key and re-encrypts every item in your browser before anything is sent. You'll get a new recovery kit too."
      >
        <div className="p-5">
          <ChangePasswordForm />
        </div>
      </SettingsSection>
    </div>
  )
}

function ChangePasswordForm() {
  const { updateMasterPassword } = useVault()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      setServerError(null)
      try {
        await updateMasterPassword(value.currentPassword, value.newPassword)
        formApi.reset()
        toast.success({
          title: 'Master password updated',
          description:
            'Every item was re-encrypted with your new key. Save your new recovery kit.',
        })
      } catch (error) {
        setServerError(
          getErrorMessage(error, 'Could not update your master password.'),
        )
      }
    },
  })

  const fields = [
    {
      name: 'currentPassword',
      label: 'Current master password',
      autoComplete: 'current-password',
    },
    {
      name: 'newPassword',
      label: 'New master password',
      autoComplete: 'new-password',
    },
    {
      name: 'confirmPassword',
      label: 'Confirm new password',
      autoComplete: 'new-password',
    },
  ] as const

  return (
    <form
      className="max-w-md"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <FormAlert message={serverError} />
        {fields.map(({ name, label, autoComplete }) => (
          <form.Field
            key={name}
            name={name}
            children={(field) => (
              <Field invalid={!field.state.meta.isValid}>
                <FieldLabel>{label}</FieldLabel>
                <MasterPasswordInput
                  autoComplete={autoComplete}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder=""
                  strength={name === 'newPassword'}
                  value={field.state.value}
                />
                <FieldError>
                  {getFieldErrorText(field.state.meta.errors)}
                </FieldError>
              </Field>
            )}
          />
        ))}
        <form.Subscribe
          selector={(s) => s.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-fit" isLoading={isSubmitting} type="submit">
              Update master password
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  )
}
