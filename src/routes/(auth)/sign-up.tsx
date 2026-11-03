import { createFileRoute } from '@tanstack/react-router'
import { SignUpForm } from '#/features/auth/sign-up-form'

export const Route = createFileRoute('/(auth)/sign-up')({
  head: () => ({ meta: [{ title: 'Create your vault · OneVault' }] }),
  component: SignUpForm,
})
