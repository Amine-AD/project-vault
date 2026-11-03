import { revalidateLogic, useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { useVault } from '#/context/VaultContext'
import { FormAlert } from './components/form-alert'
import { MasterPasswordInput } from './components/master-password-input'
import { unlockSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

/**
 * Shown inside the app when a session exists but the vault key is not in
 * memory (page reload or auto-lock).
 */
export function UnlockForm() {
  const { user, handleUnlock, handleLogout } = useVault()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      password: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: unlockSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await handleUnlock(value.password)
      } catch (error) {
        setServerError(getErrorMessage(error, 'Unable to unlock your vault.'))
      }
    },
  })

  return (
    <Card>
      <CardHeader
        title="Unlock your vault"
        description={user ? `Signed in as ${user.email}` : undefined}
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

            {/* Lets password managers associate the saved credential */}
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={user?.email ?? ''}
              readOnly
              hidden
            />

            <form.Field
              name="password"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>Master password</FieldLabel>
                  <MasterPasswordInput
                    autoComplete="current-password"
                    autoFocus
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Unlock vault
                </Button>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <Link
          className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          search={{ email: user?.email }}
          to="/recover"
        >
          Forgot master password?
        </Link>
        <p className="text-sm text-muted-foreground">
          Not you?{' '}
          <button
            type="button"
            className="underline text-foreground"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </p>
      </CardFooter>
    </Card>
  )
}
