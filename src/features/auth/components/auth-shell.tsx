import { Link } from '@tanstack/react-router'
import { ShieldCheckIcon } from 'lucide-react'
import type React from 'react'
import { BrandLogo } from '#/components/BrandLogo'
import { ThemeToggle } from '#/components/ThemeToggle'

/**
 * Centered brand layout shared by the login, sign-up and unlock screens.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden px-4 pt-20 pb-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Link to="/" className="mb-8 rounded-lg">
        <BrandLogo size="lg" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-6 flex items-center gap-1.5 text-muted-foreground text-xs">
        <ShieldCheckIcon className="size-3.5 text-primary-ink" />
        PBKDF2 600k + AES-256-GCM · zero-knowledge
      </p>
    </div>
  )
}
