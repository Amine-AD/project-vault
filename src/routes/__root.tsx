import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { VaultProvider } from '../context/VaultContext'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: '1Vault - Zero-Knowledge Password Manager',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
        <VaultProvider>{children}</VaultProvider>
        <Scripts />
      </body>
    </html>
  )
}
