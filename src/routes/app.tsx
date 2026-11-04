import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { AppLoader } from '#/components/AppLoader'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { useVault } from '#/context/VaultContext'
import { AuthShell } from '#/features/auth/components/auth-shell'
import { UnlockForm } from '#/features/auth/unlock-form'
import { SiteError } from '#/features/errors/site-status-page'
import { RecoveryKitDialog } from '#/features/recovery/recovery-kit-dialog'
import { AppSidebar } from '#/features/vault/app-sidebar'
import { PasswordGeneratorDialog } from '#/features/vault/password-generator-dialog'

export const Route = createFileRoute('/app')({
  component: AppLayout,
  // The shell itself failed, so there's no sidebar to show the app version in
  errorComponent: SiteError,
})

function AppLayout() {
  const { isLoading, user, isUnlocked } = useVault()
  const [showGenerator, setShowGenerator] = useState(false)

  if (isLoading) return <AppLoader />

  if (!user) return <Navigate to="/login" replace />

  if (!isUnlocked) {
    return (
      <AuthShell>
        <UnlockForm />
      </AuthShell>
    )
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar onOpenGenerator={() => setShowGenerator(true)} />
      <SidebarInset className="flex-row overflow-hidden">
        <Outlet />
      </SidebarInset>

      <PasswordGeneratorDialog
        open={showGenerator}
        onOpenChange={setShowGenerator}
      />
      <RecoveryKitDialog />
    </SidebarProvider>
  )
}
