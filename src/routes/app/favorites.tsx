import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '#/features/vault/vault-pane-view'

export const Route = createFileRoute('/app/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  return <VaultPaneView category="favorites" />
}
