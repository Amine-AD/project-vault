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
import { useVault } from '#/context/VaultContext'
import {
  CodeStep,
  EmailStep,
  VerifiedEmail,
} from './components/email-verification-steps'
import { FormAlert } from './components/form-alert'
import { MasterPasswordInput } from './components/master-password-input'
import { TrustDeviceCheckbox } from './components/trust-device-checkbox'
import { newMasterPasswordSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

type Step =
  | { name: 'email' }
  | { name: 'code'; email: string }
  | { name: 'password'; email: string; ticket: string }

const HEADERS: Record<Step['name'], { title: string; description: string }> = {
  email: {
    title: 'Create your vault',
    description: 'Zero-knowledge, end-to-end encrypted storage',
  },
  code: {
    title: 'Check your email',
    description: 'Confirm it’s yours before you set a master password.',
  },
  password: {
    title: 'Choose a master password',
    description:
      'It encrypts your vault in this browser. We never see it and can’t reset it.',
  },
}

/**
 * Sign-up: confirm the email with a code first, then choose the master
 * password. The vault is only created after the email is proven.
 */
export function SignUpForm() {
  const [step, setStep] = useState<Step>({ name: 'email' })
  const [lastEmail, setLastEmail] = useState('')
  const startOver = () => setStep({ name: 'email' })

  return (
    <Card>
      <CardHeader {...HEADERS[step.name]} />
      <CardContent>
        {step.name === 'email' && (
          <EmailStep
            defaultEmail={lastEmail}
            onSent={(email) => {
              setLastEmail(email)
              setStep({ name: 'code', email })
            }}
            purpose="signup"
            submitLabel="Continue"
          />
        )}
        {step.name === 'code' && (
          <CodeStep
            email={step.email}
            onChangeEmail={startOver}
            onVerified={(ticket) =>
              setStep({ name: 'password', email: step.email, ticket })
            }
            purpose="signup"
          />
        )}
        {step.name === 'password' && (
          <PasswordStep
            email={step.email}
            onStartOver={startOver}
            ticket={step.ticket}
          />
        )}
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

function PasswordStep({
  email,
  ticket,
  onStartOver,
}: {
  email: string
  ticket: string
  onStartOver: () => void
}) {
  const { handleRegister } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [trustDevice, setTrustDevice] = useState(true)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: newMasterPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await handleRegister(email, ticket, value.password, { trustDevice })
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Failed to create your vault.'))
      }
    },
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <VerifiedEmail email={email} onChange={onStartOver} />
        {/* Lets password managers save the login under the right email */}
        <input
          autoComplete="username"
          hidden
          name="email"
          readOnly
          type="email"
          value={email}
        />

        <FormAlert message={serverError} />

        <form.Field
          name="password"
          children={(field) => (
            <Field invalid={!field.state.meta.isValid}>
              <FieldLabel>Master password</FieldLabel>
              <MasterPasswordInput
                autoComplete="new-password"
                autoFocus
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

        <TrustDeviceCheckbox
          checked={trustDevice}
          onCheckedChange={setTrustDevice}
        />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Create encrypted vault
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  )
}
