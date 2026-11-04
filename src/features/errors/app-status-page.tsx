import { Link, useRouter } from '@tanstack/react-router'
import { SearchXIcon, TriangleAlertIcon } from 'lucide-react'
import type React from 'react'
import { Button } from '#/components/ui/button'
import { SidebarTrigger } from '#/components/ui/sidebar'
import { cn } from '#/lib/utils'
import { ErrorDetails } from './error-details'

/**
 * Status screen inside the app shell: renders in the content pane, so the
 * sidebar stays put and the user can go anywhere from here. Quieter than
 * the website version, in the style of the vault's empty states and
 * settings rows. Must render inside the SidebarProvider.
 */
function AppStatusPage({
  icon,
  tone = 'primary',
  code,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  tone?: 'primary' | 'destructive'
  code: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh flex-1 flex-col bg-background">
      <div className="p-4 md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div
            className={cn(
              'flex size-16 items-center justify-center rounded-2xl [&_svg]:size-7',
              tone === 'primary'
                ? 'bg-primary/10 text-primary-ink dark:bg-primary/20'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {icon}
          </div>
          <div className="space-y-2">
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Error {code}
            </p>
            <h1 className="font-display font-semibold text-2xl tracking-tight md:text-3xl">
              {title}
            </h1>
            <p className="text-pretty text-muted-foreground text-sm">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Unknown page inside the app, e.g. /app/typo. */
export function AppNotFound() {
  return (
    <AppStatusPage
      code="404"
      description="This page doesn’t exist in OneVault. Your items are all where you left them."
      icon={<SearchXIcon />}
      title="Page not found"
    >
      <Button asChild>
        <Link to="/app/all">Go to all items</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/app/settings">Open settings</Link>
      </Button>
    </AppStatusPage>
  )
}

/** Unexpected error on an app page. */
export function AppError({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}) {
  const router = useRouter()

  return (
    <AppStatusPage
      code="500"
      description="This page hit an unexpected error. Your vault is still encrypted and nothing was lost. Try again, or reload the page."
      icon={<TriangleAlertIcon />}
      title="Something went wrong"
      tone="destructive"
    >
      <Button
        onClick={() => {
          reset()
          router.invalidate()
        }}
      >
        Try again
      </Button>
      <Button onClick={() => window.location.reload()} variant="outline">
        Reload page
      </Button>
      <ErrorDetails className="mt-2" error={error} />
    </AppStatusPage>
  )
}
