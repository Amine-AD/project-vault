import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { AuthModal } from '../components/AuthModal'
import { PasswordGeneratorModal } from '../components/PasswordGeneratorModal'
import { ImportExportModal } from '../components/ImportExportModal'
import { useVault } from '../context/VaultContext'
import { Shield } from 'lucide-react'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  const { isLoading, isUnlocked } = useVault()
  const [showGenerator, setShowGenerator] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center animate-pulse">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs font-medium text-slate-400">
          Loading 1Vault...
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950">
      {/* Sidebar with Navigation Links to /app/* */}
      <Sidebar
        onOpenGenerator={() => setShowGenerator(true)}
        onOpenImportExport={() => setShowImportExport(true)}
      />

      {/* Dynamic Pane / Sub-route Content */}
      <div className="flex-1 flex overflow-hidden">
        <Outlet />
      </div>

      {/* Auth / Unlock Modal */}
      {!isUnlocked && <AuthModal />}

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
      />
    </div>
  )
}
