import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // SQLite writes (sessions, items) must not trigger dev reloads, which would
  // wipe the in-memory vault key and lock the vault.
  server: { watch: { ignored: ['**/*.db', '**/*.db-*'] } },
  plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
