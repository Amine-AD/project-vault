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

export const signUpSchema = z
  .object({
    email,
    password: z
      .string()
      .min(
        MASTER_PASSWORD_MIN_LENGTH,
        `Master password must be at least ${MASTER_PASSWORD_MIN_LENGTH} characters`,
      ),
    confirmPassword: z.string().min(1, 'Please confirm your master password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Master passwords do not match',
    path: ['confirmPassword'],
  })

export const unlockSchema = z.object({
  password: z.string().min(1, 'Master password is required'),
})

export const recoverSchema = z
  .object({
    email,
    recoveryKey: z.string().trim().min(1, 'Enter your recovery key'),
    password: z
      .string()
      .min(
        MASTER_PASSWORD_MIN_LENGTH,
        `Master password must be at least ${MASTER_PASSWORD_MIN_LENGTH} characters`,
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new master password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Master passwords do not match',
    path: ['confirmPassword'],
  })
