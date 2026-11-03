import { LogoMark } from './BrandLogo'

export function AppLoader() {
  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-4">
      <LogoMark className="size-12 animate-pulse" />
      <p className="font-medium text-muted-foreground text-sm">
        Loading OneVault…
      </p>
    </div>
  )
}
