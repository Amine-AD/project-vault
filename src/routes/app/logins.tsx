import { createFileRoute } from '@tanstack/react-router'
import { VaultPaneView } from '../../components/VaultPaneView'

export const Route = createFileRoute('/app/logins')({
  component: LoginsPage,
})

function LoginsPage() {
  return <VaultPaneView category="login" />
}
