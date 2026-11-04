import {
  createRootRoute,
  HeadContent,
  Scripts,
  useRouter,
} from '@tanstack/react-router'
import { Toaster } from '#/components/ui/toast'
import { themeInitScript } from '#/lib/theme'
import { VaultProvider } from '../context/VaultContext'
import appCss from '../styles.css?url'

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'OneVault · Zero-knowledge password manager' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: FONTS_URL },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // The CSP nonce (production server render only, see src/start.ts)
  const nonce = useRouter().options.ssr?.nonce
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap, prevents a flash of the wrong theme
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <HeadContent />
      </head>
      <body>
        <VaultProvider>
          <main>{children}</main>
        </VaultProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
