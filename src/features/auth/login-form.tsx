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
import { loginSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

export function LoginForm() {
  const { handleLogin } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await handleLogin(value.email.trim(), value.password)
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Unable to sign in.'))
      }
    },
  })

  return (
    <Card>
      <CardHeader
        title="Sign in to OneVault"
        description="Your vault is decrypted locally in your browser"
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
                  <div className="flex items-center justify-between">
                    <FieldLabel>Master password</FieldLabel>
                    <Link
                      className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                      to="/recover"
                    >
                      Forgot it?
                    </Link>
                  </div>
                  <MasterPasswordInput
                    autoComplete="current-password"
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
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Don't have a vault yet?{' '}
          <Link className="underline text-foreground" to="/sign-up">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
