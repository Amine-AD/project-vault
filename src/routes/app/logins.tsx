import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '#/features/vault/vault-pane-view'

export const Route = createFileRoute('/app/logins')({
  component: LoginsPage,
})

function LoginsPage() {
  return <VaultPaneView category="login" />
}
