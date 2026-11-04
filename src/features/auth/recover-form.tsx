import { revalidateLogic, useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { LaptopIcon, LockIcon } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { toast } from '#/components/ui/toast'
import { useVault } from '#/context/VaultContext'
import { getDeviceId } from '#/lib/trusted-device'
import {
  CodeStep,
  EmailStep,
  VerifiedEmail,
} from './components/email-verification-steps'
import { FormAlert } from './components/form-alert'
import { MasterPasswordInput } from './components/master-password-input'
import { newVaultPasswordSchema, recoverSchema } from './schemas'
import { getErrorMessage, getFieldErrorText } from './utils'

interface Verified {
  email: string
  ticket: string
  /** This browser is a trusted device for the email. */
  onDevice: boolean
}

type Step =
  | { name: 'email' }
  | { name: 'code'; email: string }
  | ({ name: 'device' } & Verified)
  | ({ name: 'key' } & Verified)
  | ({ name: 'reset' } & Verified)

const HEADERS: Record<Step['name'], { title: string; description: string }> = {
  email: {
    title: 'Recover your vault',
    description: 'First, confirm the email your vault is registered to.',
  },
  code: {
    title: 'Check your email',
    description: 'Enter the code to continue.',
  },
  device: {
    title: 'Recover on this device',
    description:
      'You’ve unlocked your vault here before, so you can set a new master password.',
  },
  key: {
    title: 'Enter your recovery key',
    description:
      'Use the key from your recovery kit to set a new master password.',
  },
  reset: {
    title: 'Start a new vault',
    description: 'Your current items are kept locked, not deleted.',
  },
}

/**
 * Forgotten master password. The email is confirmed with a code first, so a
 * found recovery kit or a stolen laptop alone isn't enough. Then either:
 *  - this browser, if it's a trusted device, unlocks the vault, or
 *  - the recovery key does.
 * Either way everything is re-encrypted in the browser under the new
 * password. Without both, a new empty vault is started and the old items
 * are locked away (not deleted) until the old password or key turns up.
 */
export function RecoverForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [step, setStep] = useState<Step>({ name: 'email' })
  const [lastEmail, setLastEmail] = useState(defaultEmail)
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
            purpose="recovery"
            submitLabel="Send code"
          />
        )}
        {step.name === 'code' && (
          <CodeStep
            email={step.email}
            onChangeEmail={startOver}
            onVerified={async (ticket) => {
              const onDevice = !!(await getDeviceId(step.email))
              const verified = { email: step.email, ticket, onDevice }
              setStep(
                onDevice
                  ? { name: 'device', ...verified }
                  : { name: 'key', ...verified },
              )
            }}
            purpose="recovery"
          />
        )}
        {step.name === 'device' && (
          <DeviceStep
            {...step}
            onStartOver={startOver}
            onUseKey={() => setStep({ ...step, name: 'key' })}
          />
        )}
        {step.name === 'key' && (
          <RecoveryKeyStep
            {...step}
            onNoKey={() => setStep({ ...step, name: 'reset' })}
            onStartOver={startOver}
            onUseDevice={() => setStep({ ...step, name: 'device' })}
          />
        )}
        {step.name === 'reset' && (
          <ResetStep
            {...step}
            onBack={() => setStep({ ...step, name: 'key' })}
            onStartOver={startOver}
          />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          Remembered it?{' '}
          <Link className="text-foreground underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

type VerifiedStepProps = Verified & { onStartOver: () => void }

const linkButton =
  'text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline'

/** The verified email, plus a hidden username field for password managers. */
function EmailHeader({
  email,
  onStartOver,
}: {
  email: string
  onStartOver: () => void
}) {
  return (
    <>
      <VerifiedEmail email={email} onChange={onStartOver} />
      <input
        autoComplete="username"
        hidden
        name="email"
        readOnly
        type="email"
        value={email}
      />
    </>
  )
}

const PASSWORD_FIELDS = [
  {
    name: 'password',
    label: 'New master password',
    placeholder: 'Choose a new master password',
  },
  {
    name: 'confirmPassword',
    label: 'Confirm new master password',
    placeholder: 'Repeat it',
  },
] as const

/** New password + confirmation, for any form with those two fields. */
function NewPasswordFields({
  form,
  autoFocus = false,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: shared by forms with different extra fields
  form: any
  autoFocus?: boolean
}) {
  return PASSWORD_FIELDS.map(({ name, label, placeholder }) => (
    <form.Field
      key={name}
      name={name}
      // biome-ignore lint/suspicious/noExplicitAny: see above
      children={(field: any) => (
        <Field invalid={!field.state.meta.isValid}>
          <FieldLabel>{label}</FieldLabel>
          <MasterPasswordInput
            autoComplete="new-password"
            autoFocus={autoFocus && name === 'password'}
            name={field.name}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder={placeholder}
            strength={name === 'password'}
            value={field.state.value}
          />
          <FieldError>{getFieldErrorText(field.state.meta.errors)}</FieldError>
        </Field>
      )}
    />
  ))
}

function DeviceStep({
  email,
  ticket,
  onStartOver,
  onUseKey,
}: VerifiedStepProps & { onUseKey: () => void }) {
  const { recoverVault } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: newVaultPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await recoverVault(email, ticket, { kind: 'device' }, value.password)
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Could not recover your vault.'))
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
        <EmailHeader email={email} onStartOver={onStartOver} />

        <Alert variant="info">
          <LaptopIcon />
          <AlertTitle>This browser is a trusted device</AlertTitle>
          <AlertDescription>
            It holds a key that can open your vault, so your items are kept. No
            recovery key needed.
          </AlertDescription>
        </Alert>

        <FormAlert message={serverError} />
        <NewPasswordFields autoFocus form={form} />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-full" isLoading={isSubmitting} type="submit">
              Recover vault
            </Button>
          )}
        />
        <p className="text-center text-muted-foreground text-xs">
          Everything is decrypted and re-encrypted in your browser. Other
          devices will be signed out, and you’ll get a new recovery kit.
        </p>
        <button className={linkButton} onClick={onUseKey} type="button">
          Use my recovery key instead
        </button>
      </FieldGroup>
    </form>
  )
}

function RecoveryKeyStep({
  email,
  ticket,
  onDevice,
  onStartOver,
  onNoKey,
  onUseDevice,
}: VerifiedStepProps & { onNoKey: () => void; onUseDevice: () => void }) {
  const { recoverVault } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { recoveryKey: '', password: '', confirmPassword: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: recoverSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await recoverVault(
          email,
          ticket,
          { kind: 'recoveryKey', recoveryKey: value.recoveryKey },
          value.password,
        )
        await navigate({ to: '/app' })
      } catch (error) {
        setServerError(getErrorMessage(error, 'Could not recover your vault.'))
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
        <EmailHeader email={email} onStartOver={onStartOver} />
        <FormAlert message={serverError} />

        <form.Field
          name="recoveryKey"
          children={(field) => (
            <Field invalid={!field.state.meta.isValid}>
              <FieldLabel>Recovery key</FieldLabel>
              <Input
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
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

        <NewPasswordFields form={form} />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-full" isLoading={isSubmitting} type="submit">
              Recover vault
            </Button>
          )}
        />
        <p className="text-center text-muted-foreground text-xs">
          Everything is decrypted and re-encrypted in your browser. Other
          devices will be signed out.
        </p>
        {onDevice ? (
          <button className={linkButton} onClick={onUseDevice} type="button">
            Recover on this device instead
          </button>
        ) : null}
        <button className={linkButton} onClick={onNoKey} type="button">
          I don’t have my recovery key
        </button>
      </FieldGroup>
    </form>
  )
}

function ResetStep({
  email,
  ticket,
  onStartOver,
  onBack,
}: VerifiedStepProps & { onBack: () => void }) {
  const { resetVault } = useVault()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: newVaultPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        const locked = await resetVault(email, ticket, value.password)
        await navigate({ to: '/app' })
        if (locked > 0) {
          toast.info({
            title: `${locked} ${locked === 1 ? 'item is' : 'items are'} locked, not deleted`,
            description:
              'Found your old password or recovery key? Restore them in Settings → Security.',
            duration: 15_000,
          })
        }
      } catch (error) {
        setServerError(getErrorMessage(error, 'Could not start a new vault.'))
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
        <EmailHeader email={email} onStartOver={onStartOver} />

        <Alert variant="warning">
          <LockIcon />
          <AlertTitle>Your items stay locked until you unlock them</AlertTitle>
          <AlertDescription>
            They’re encrypted with your old master password, so nobody can open
            them without it or your recovery key, including us. You’ll start
            with an empty vault. If you remember the old password or find your
            recovery key later, restore everything from Settings.
          </AlertDescription>
        </Alert>

        <FormAlert message={serverError} />
        <NewPasswordFields form={form} />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-full" isLoading={isSubmitting} type="submit">
              Start a new vault
            </Button>
          )}
        />
        <p className="text-center text-muted-foreground text-xs">
          Other devices will be signed out.
        </p>
        <button className={linkButton} onClick={onBack} type="button">
          I found my recovery key
        </button>
      </FieldGroup>
    </form>
  )
}
