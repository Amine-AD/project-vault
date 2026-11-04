import { revalidateLogic, useForm } from '@tanstack/react-form'
import { MailCheckIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  InputOTP,
  InputOTPSeparator,
  InputOTPSlot,
} from '#/components/ui/input-otp'
import { requestEmailCode, verifyEmailCode } from '#/server/auth'
import { emailCodeSchema, emailStepSchema } from '../schemas'
import { getErrorMessage, getFieldErrorText } from '../utils'
import { FormAlert } from './form-alert'

type Purpose = 'signup' | 'recovery'

const CODE_LENGTH = 6

/** Matches the server's resend cooldown. */
const RESEND_COOLDOWN_S = 45

async function sendCode(email: string, purpose: Purpose) {
  const res = await requestEmailCode({ data: { email, purpose } })
  if (!res.success) throw new Error(res.error)
}

/** Step 1: ask for the email and send it a code. */
export function EmailStep({
  purpose,
  defaultEmail = '',
  submitLabel,
  onSent,
}: {
  purpose: Purpose
  defaultEmail?: string
  submitLabel: string
  onSent: (email: string) => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: defaultEmail },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: emailStepSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const email = value.email.trim().toLowerCase()
      try {
        await sendCode(email, purpose)
        onSent(email)
      } catch (error) {
        setServerError(getErrorMessage(error, "Couldn't send the code."))
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
        <FormAlert message={serverError} />

        <form.Field
          name="email"
          children={(field) => (
            <Field invalid={!field.state.meta.isValid}>
              <FieldLabel>Email address</FieldLabel>
              <Input
                autoComplete="email"
                autoFocus
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

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-full" isLoading={isSubmitting} type="submit">
              {submitLabel}
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  )
}

/** Step 2: enter the emailed code; returns a ticket for the next step. */
export function CodeStep({
  email,
  purpose,
  onVerified,
  onChangeEmail,
}: {
  email: string
  purpose: Purpose
  onVerified: (ticket: string) => void
  onChangeEmail: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const form = useForm({
    defaultValues: { code: '' },
    // Only check on submit: a half-typed code isn't an error
    validationLogic: revalidateLogic({ modeAfterSubmission: 'submit' }),
    validators: { onDynamic: emailCodeSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setNotice(null)
      try {
        const res = await verifyEmailCode({
          data: { email, purpose, code: value.code },
        })
        if (!res.success) throw new Error(res.error)
        onVerified(res.ticket)
      } catch (error) {
        setServerError(getErrorMessage(error, "Couldn't check the code."))
        clearCode()
      }
    },
  })

  // The OTP input keeps its own value: in Ark's controlled mode focus moves
  // before the new value arrives, so the cursor sticks in the first slot.
  // Clearing remounts it.
  const [otpKey, setOtpKey] = useState(0)
  const clearCode = () => {
    form.reset()
    setOtpKey((key) => key + 1)
  }

  // Focus the first slot on mount and after each clear. Ark's autoFocus
  // doesn't do it on a remount: the slot gets the cursor, but typed digits
  // don't advance. A real focus() call lets Ark track the active slot.
  const otpRef = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus on remount
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      otpRef.current
        ?.querySelector<HTMLInputElement>('[data-slot=input-otp-input]')
        ?.focus(),
    )
    return () => cancelAnimationFrame(frame)
  }, [otpKey])

  const resend = async () => {
    setServerError(null)
    setNotice(null)
    setIsResending(true)
    try {
      await sendCode(email, purpose)
      clearCode()
      setNotice('We sent a new code. Only the newest one works.')
      setCooldown(RESEND_COOLDOWN_S)
    } catch (error) {
      setServerError(getErrorMessage(error, "Couldn't send a new code."))
    } finally {
      setIsResending(false)
    }
  }

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
        <div className="flex items-start gap-2.5 rounded-lg border bg-muted/48 p-3 text-sm">
          <MailCheckIcon className="mt-0.5 size-4 shrink-0 text-primary-ink" />
          <p className="min-w-0 text-muted-foreground leading-snug">
            {purpose === 'signup'
              ? 'We sent a 6-digit code to '
              : 'If there’s a vault for this email, we sent a 6-digit code to '}
            <span className="break-all font-medium text-foreground">
              {email}
            </span>
            . It expires in 10 minutes.
          </p>
        </div>

        <FormAlert message={serverError} />
        {notice && (
          <p className="text-muted-foreground text-sm" role="status">
            {notice}
          </p>
        )}

        <form.Field
          name="code"
          children={(field) => (
            <Field invalid={!field.state.meta.isValid}>
              <FieldLabel>Verification code</FieldLabel>
              <div ref={otpRef}>
                <InputOTP
                  className="justify-between *:data-[slot=input-otp-input]:h-11 *:data-[slot=input-otp-input]:w-full *:data-[slot=input-otp-input]:text-lg"
                  count={CODE_LENGTH}
                  invalid={!field.state.meta.isValid}
                  key={otpKey}
                  name={field.name}
                  onValueChange={({ valueAsString }) =>
                    field.handleChange(valueAsString)
                  }
                  onValueComplete={() => {
                    if (!form.state.isSubmitting) form.handleSubmit()
                  }}
                  type="numeric"
                >
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSeparator className="shrink-0 bg-muted-foreground/48" />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTP>
              </div>
              <FieldError>
                {getFieldErrorText(field.state.meta.errors)}
              </FieldError>
            </Field>
          )}
        />

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button className="w-full" isLoading={isSubmitting} type="submit">
              Verify email
            </Button>
          )}
        />

        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onChangeEmail}
            type="button"
          >
            Use a different email
          </button>
          <button
            className="text-muted-foreground underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:opacity-60"
            disabled={cooldown > 0 || isResending}
            onClick={resend}
            type="button"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        {purpose === 'signup' && (
          <p className="text-center text-muted-foreground text-xs">
            Already have a vault with this email? The email will tell you how to
            sign in.
          </p>
        )}
      </FieldGroup>
    </form>
  )
}

/** The confirmed email shown on later steps, with a way to start over. */
export function VerifiedEmail({
  email,
  onChange,
}: {
  email: string
  onChange: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/48 px-3 py-2 text-sm">
      <MailCheckIcon className="size-4 shrink-0 text-primary-ink" />
      <span className="min-w-0 flex-1 truncate font-medium">{email}</span>
      <button
        className="shrink-0 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
        onClick={onChange}
        type="button"
      >
        Change
      </button>
    </div>
  )
}
