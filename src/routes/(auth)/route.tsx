import {
  createFileRoute,
  Navigate,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { AppLoader } from '#/components/AppLoader'
import { useVault } from '#/context/VaultContext'
import { AuthShell } from '#/features/auth/components/auth-shell'

export const Route = createFileRoute('/(auth)')({
  component: AuthLayout,
})

function AuthLayout() {
  const { user, isLoading, isUnlocked } = useVault()
  const pathname = useLocation({ select: (l) => l.pathname })
  // Recovery also works from a locked session (it replaces all sessions)
  const isLockedRecovery = pathname === '/recover' && !isUnlocked

  if (isLoading) return <AppLoader />

  // Already have a session: the app shows the vault, or the unlock screen if locked.
  if (user && !isLockedRecovery) return <Navigate to="/app" replace />

  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  )
}
