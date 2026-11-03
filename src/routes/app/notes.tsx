import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '#/features/vault/vault-pane-view'

export const Route = createFileRoute('/app/notes')({
  component: NotesPage,
})

function NotesPage() {
  return <VaultPaneView category="note" />
}
