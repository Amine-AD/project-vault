import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '#/features/vault/vault-pane-view'

export const Route = createFileRoute('/app/all')({
  component: AllPage,
})

function AllPage() {
  return <VaultPaneView category="all" />
}
