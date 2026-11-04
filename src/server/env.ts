import fs from 'node:fs'
import path from 'node:path'

/**
 * Loads settings from a .env file in the folder the server is started from,
 * once, before anything reads them. Modules that read process.env import
 * this first, so it doesn't matter which of them loads first. Variables
 * already set in the real environment (Docker, systemd, a hosting
 * dashboard) win over the file.
 */

const envFile = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch (err) {
    console.error('[env] Could not read .env', err)
  }
}
