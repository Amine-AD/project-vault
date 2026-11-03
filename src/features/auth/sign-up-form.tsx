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
import { signUpSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

export function SignUpForm() {
  const { handleRegister } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await handleRegister(value.email.trim(), value.password)
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Failed to create your vault.'))
      }
    },
  })

  return (
    <Card>
      <CardHeader
        title="Create your vault"
        description="Zero-knowledge, end-to-end encrypted storage"
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
                    type="email"
                    autoComplete="email"
                    autoFocus
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="you@example.com"
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
                  <FieldLabel>Master password</FieldLabel>
                  <MasterPasswordInput
                    autoComplete="new-password"
                    strength
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

            <form.Field
              name="confirmPassword"
              children={(field) => (
                <Field invalid={!field.state.meta.isValid}>
                  <FieldLabel>Confirm master password</FieldLabel>
                  <MasterPasswordInput
                    autoComplete="new-password"
                    placeholder="Repeat master password"
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
                  Create encrypted vault
                </Button>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have a vault?{' '}
          <Link className="underline text-foreground" to="/login">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
