import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RecoverForm } from '#/features/auth/recover-form'

export const Route = createFileRoute('/(auth)/recover')({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({ meta: [{ title: 'Recover your vault · OneVault' }] }),
  component: RecoverPage,
})

function RecoverPage() {
  const { email } = Route.useSearch()
  return <RecoverForm defaultEmail={email} />
}
