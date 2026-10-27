import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '../../components/VaultPaneView'

export const Route = createFileRoute('/app/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  return <VaultPaneView category="favorites" />
}
