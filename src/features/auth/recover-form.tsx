import { revalidateLogic, useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from './components/form-alert'
import { MasterPasswordInput } from './components/master-password-input'
import { recoverSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

/**
 * Forgotten master password: the recovery key unlocks the vault in the
 * browser, everything is re-encrypted under the new password and a new
 * recovery key is issued (shown in the app right after).
 */
export function RecoverForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const { recoverVault } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: defaultEmail,
      recoveryKey: '',
      password: '',
      confirmPassword: '',
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: recoverSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await recoverVault(
          value.email.trim(),
          value.recoveryKey,
          value.password,
        )
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Could not recover your vault.'))
      }
    },
  })

  return (
    <Card>
      <CardHeader
        title="Recover your vault"
        description="Use the recovery key from your recovery kit to set a new master password."
      />
      <CardContent>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <FormAlert message={serverError} />

            <form.Field
              name="email"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>Email address</FieldLabel>
                  <Input
                    autoComplete="email"
                    autoFocus={!defaultEmail}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={field.state.value}
                  />
                  <FieldError>
                    {getFieldErrorText(field.state.meta.errors)}
                  </FieldError>
                </Field>
              )}
            />

            <form.Field
              name="recoveryKey"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>Recovery key</FieldLabel>
                  <Input
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoFocus={!!defaultEmail}
                    className="font-mono uppercase tracking-wide"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="OV-XXXX-XXXX-XXXX-…"
                    spellCheck={false}
                    value={field.state.value}
                  />
                  <FieldError>
                    {getFieldErrorText(field.state.meta.errors)}
                  </FieldError>
                </Field>
              )}
            />

            <form.Field
              name="password"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>New master password</FieldLabel>
                  <MasterPasswordInput
                    autoComplete="new-password"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Choose a new master password"
                    strength
                    value={field.state.value}
                  />
                  <FieldError>
                    {getFieldErrorText(field.state.meta.errors)}
                  </FieldError>
                </Field>
              )}
            />

            <form.Field
              name="confirmPassword"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>Confirm new master password</FieldLabel>
                  <MasterPasswordInput
                    autoComplete="new-password"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Repeat it"
                    value={field.state.value}
                  />
                  <FieldError>
                    {getFieldErrorText(field.state.meta.errors)}
                  </FieldError>
                </Field>
              )}
            />

            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  className="w-full"
                  isLoading={isSubmitting}
                  type="submit"
                >
                  Recover vault
                </Button>
              )}
            />
            <p className="text-center text-muted-foreground text-xs">
              Everything is decrypted and re-encrypted in your browser. Other
              devices will be signed out.
            </p>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          No recovery kit? Without it, a forgotten master password can't be
          reset. That's what keeps your vault private.{' '}
          <Link className="text-foreground underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
