import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '../../components/VaultPaneView'

export const Route = createFileRoute('/app/notes')({
  component: NotesPage,
})

function NotesPage() {
  return <VaultPaneView category="note" />
}
