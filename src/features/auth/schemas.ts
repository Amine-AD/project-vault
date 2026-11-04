import { z } from 'zod'

export const MASTER_PASSWORD_MIN_LENGTH = 10

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Master password is required'),
})

/** First step of sign-up and recovery: where to send the code. */
export const emailStepSchema = z.object({ email })

/** The 6-digit emailed code; spaces and dashes are ignored. */
export const emailCodeSchema = z.object({
  code: z
    .string()
    .refine(
      (value) => value.replace(/\D/g, '').length === 6,
      'Enter the 6-digit code from the email',
    ),
})

const newPassword = z
  .string()
  .min(
    MASTER_PASSWORD_MIN_LENGTH,
    `Master password must be at least ${MASTER_PASSWORD_MIN_LENGTH} characters`,
  )

const passwordsMatch = {
  message: 'Master passwords do not match',
  path: ['confirmPassword'],
}

export const newMasterPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your master password'),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordsMatch,
  )

export const unlockSchema = z.object({
  password: z.string().min(1, 'Master password is required'),
})

export const recoverSchema = z
  .object({
    recoveryKey: z.string().trim().min(1, 'Enter your recovery key'),
    password: newPassword,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new master password'),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordsMatch,
  )

/** Recovering on a trusted device, or starting a new vault: just a password. */
export const newVaultPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new master password'),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordsMatch,
  )
