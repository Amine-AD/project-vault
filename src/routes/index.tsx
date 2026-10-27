import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Shield,
  KeyRound,
  FileText,
  Lock,
  ArrowRight,
  Database,
  Cpu,
  Clock,
  Sparkles,
  Code2,
  CheckCircle2,
  Terminal,
} from 'lucide-react'
import { useVault } from '../context/VaultContext'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { isUnlocked, items } = useVault()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">
                1Vault
              </span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Zero-Knowledge
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <a href="#architecture" className="hover:text-slate-200 transition-colors">
              Security Architecture
            </a>
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <a href="#self-host" className="hover:text-slate-200 transition-colors">
              Self-Hosting
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/app/all"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              {isUnlocked ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Resume Vault ({items.length})</span>
                </>
              ) : (
                <>
                  <span>Launch Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="flex h-2 w-2 rounded-full bg-blue-500" />
              <span>PBKDF2 600,000 Rounds &bull; AES-256-GCM Authenticated Encryption</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight">
              Your Passwords. Your Keys.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                Never Compromised.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
              1Vault is an open-source, zero-knowledge password manager designed for local-first self-hosting.
              Master passwords and decryption keys never touch the server or disk unencrypted.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                to="/app/all"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Open 1Vault Web App</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#architecture"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>How Security Works</span>
              </a>
            </div>

            {/* Simulated Desktop Preview Mockup */}
            <div className="pt-10 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden p-2 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 rounded-t-xl text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-slate-500">1vault-client // local-memory-mode</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Vault Unlocked
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-left text-xs">
                  {/* Mock Sidebar */}
                  <div className="p-4 space-y-3 bg-slate-950/40">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Categories
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" />
                          <span>All Items</span>
                        </div>
                        <span className="bg-blue-700 text-[10px] px-1.5 py-0.2 rounded">12</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Logins</span>
                        </div>
                        <span>9</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Secure Notes</span>
                        </div>
                        <span>3</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Item List */}
                  <div className="p-4 space-y-2 bg-slate-950/20">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Credentials
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-slate-200 space-y-1">
                      <div className="font-semibold text-slate-100 flex items-center justify-between">
                        <span>GitHub - Production</span>
                        <span className="text-[10px] text-blue-400 font-mono">2FA Active</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">dev-lead@company.internal</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-200">AWS Root Infrastructure</div>
                      <div className="text-slate-500 text-[11px]">ops-admin@cloud.io</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-200">PostgreSQL Recovery Key</div>
                      <div className="text-slate-500 text-[11px]">Secure Note &bull; 2 custom fields</div>
                    </div>
                  </div>

                  {/* Mock Detail Pane */}
                  <div className="p-4 space-y-3 bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-100 text-sm">GitHub - Production</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AES-256 Verified
                      </span>
                    </div>
                    <div className="space-y-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Username:</span>
                        <span className="text-slate-200">dev-lead@company.internal</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Password:</span>
                        <span className="text-blue-400 font-mono tracking-widest">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">TOTP (2FA):</span>
                        <span className="text-emerald-400 font-bold tracking-wider">749 821 (22s)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Architecture Section */}
        <section id="architecture" className="py-16 md:py-24 border-t border-slate-800/80 bg-slate-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-100">
                Zero-Knowledge Cryptography Explained
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                We believe in mathematical guarantees, not corporate promises. Here is exactly what happens to your data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  PBKDF2 Key Derivation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your master password is never sent to the server. Your browser hashes it using <strong>PBKDF2</strong> with SHA-256 across <strong>600,000 rounds</strong> and a unique salt. This derives two isolated keys: an <em>Auth Key</em> (for server login) and a <em>Vault Key</em> (for encryption).
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  AES-256-GCM Encryption
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every login credential and secure note is encrypted inside browser memory using <strong>AES-256-GCM</strong> with an unpredictable 12-byte initialization vector (IV). The Galois/Counter Mode ensures both confidentiality and mathematical tamper resistance.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  Opaque SQLite Storage
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The SQLite database stores only random strings of ciphertext. If a rogue administrator, database dump, or cloud backup is inspected, zero passwords, URLs, or notes can be read. Only you hold the master key.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 md:py-24 border-t border-slate-800/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl font-extrabold text-slate-100">
                Engineered for Complete Control
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                All the features you expect from a premium password manager, built without spyware or telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <KeyRound className="w-6 h-6 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">Built-in 2FA (TOTP)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generates standard RFC 6238 two-factor authentication codes with animated 30-second countdowns.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <Clock className="w-6 h-6 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Idle Auto-Lock</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatically clears vault keys from memory when your device is inactive for a configurable duration.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <FileText className="w-6 h-6 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200">Secure Notes & Custom Fields</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Store server SSH keys, recovery codes, and custom hidden fields with full client-side encryption.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <Database className="w-6 h-6 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-200">CSV & JSON Migration</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Seamlessly import existing credentials from Bitwarden, 1Password, Chrome, or custom CSV tables.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">Cryptographic Generator</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate unguessable passwords using system entropy (`window.crypto.getRandomValues`) with custom rules.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <Shield className="w-6 h-6 text-rose-400" />
                <h3 className="text-sm font-semibold text-slate-200">Clipboard Auto-Clear</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Safeguards copied passwords by automatically wiping them from your operating system clipboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Self-Hosting Section */}
        <section id="self-host" className="py-16 md:py-24 border-t border-slate-800/80 bg-slate-900/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-100">
                Self-Host in Under 2 Minutes
              </h2>
              <p className="text-sm text-slate-400">
                Runs on any server or local machine with Node.js. Uses local SQLite in WAL mode.
              </p>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-500">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>terminal</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <p className="text-slate-500"># 1. Clone repository</p>
                <p className="text-blue-400 font-semibold">git clone https://github.com/your-username/1password-clone.git</p>
                <p className="text-slate-500 pt-2"># 2. Install dependencies & build</p>
                <p className="text-blue-400 font-semibold">cd 1password-clone && npm install</p>
                <p className="text-slate-500 pt-2"># 3. Launch local vault server</p>
                <p className="text-emerald-400 font-semibold">npm run dev</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Single SQLite file</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No cloud lock-in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Client-side cryptography</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span>1Vault &bull; Open-Source Zero-Knowledge Password Vault</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/app/all" className="hover:text-slate-300 transition-colors">
              Vault App
            </Link>
            <Link to="/app/settings" className="hover:text-slate-300 transition-colors">
              Settings
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-slate-300 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
