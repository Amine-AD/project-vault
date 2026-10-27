import { createFileRoute } from '@tanstack/react-router'
import { SettingsView } from '../../components/SettingsView'

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return <SettingsView />
}
