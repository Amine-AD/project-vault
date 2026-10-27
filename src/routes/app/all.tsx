import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '../../components/VaultPaneView'

export const Route = createFileRoute('/app/all')({
  component: AllItemsPage,
})

function AllItemsPage() {
  return <VaultPaneView category="all" />
}
