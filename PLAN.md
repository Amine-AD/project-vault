# Implementation Plan: 1Password Clone (MVP)

This document tracks the step-by-step progress of the Star-Marked (⭐) MVP features to guarantee nothing is missed.

---

## Feature Checklist & Status

| Category | Feature | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Security** | Zero-Knowledge Architecture | 🟢 Completed | Client-side Web Crypto (AES-256-GCM + PBKDF2 600,000 iterations) |
| **Security** | Master Password Derivation & Pre-login | 🟢 Completed | `src/lib/crypto.ts` derives `vaultKey` & `authKey` |
| **Security** | Auto-Lock & Inactivity Timer | 🟢 Completed | Activity listener for idle timeout and immediate memory wipe |
| **Item Management** | Login Items (Username, Password, URL, Note) | 🟢 Completed | View, edit, hide/reveal, 1-click copy |
| **Item Management** | Secure Notes Item Type | 🟢 Completed | Encrypted markdown/plaintext notes |
| **Item Management** | Custom Fields (Text, Hidden/Password) | 🟢 Completed | Dynamic key-value pairs per item |
| **Search & Org** | Instant Client-Side Search | 🟢 Completed | Search across titles, usernames, URLs, notes |
| **Search & Org** | Favorites & Categories / Tags | 🟢 Completed | Star items, filter by type or user tags |
| **Generator** | Password Generator Tool | 🟢 Completed | Length slider, character sets, avoid ambiguous, strength meter |
| **2FA / Authenticator** | Built-in TOTP Authenticator | 🟢 Completed | `otpauth` RFC 6238 rolling 6-digit codes with live countdown |
| **Self-Hosting** | Single-User / Local SQLite Database | 🟢 Completed | Auto-initializing `better-sqlite3` + Drizzle ORM |
| **Import / Export** | Plaintext & Encrypted Backup Export | 🟢 Completed | Export vault to clean JSON backup file |
| **Import / Export** | Data Import (CSV / JSON) | 🟢 Completed | Import from 1Password, Bitwarden, or browser CSV |
| **UI Experience** | Simple, Non-AI-Slap 3-Pane Interface | 🟢 Completed | Authentic desktop-style dark theme with crisp layout |

---

## Completed Milestones

### Phase 1: Environment & Scaffolding ✅
- [x] Scaffolded TanStack Start project with React 19, TypeScript, and Tailwind CSS.
- [x] Installed Drizzle ORM, `better-sqlite3`, `otpauth`, `bcryptjs`, and `lucide-react`.
- [x] Configured SQLite database with WAL mode and auto-table initialization in [src/db/index.ts](file:///d:/projects/1password-clone/src/db/index.ts).

### Phase 2: Zero-Knowledge Web Crypto Engine ✅
- [x] Built [src/lib/crypto.ts](file:///d:/projects/1password-clone/src/lib/crypto.ts) using native Web Crypto API (`window.crypto.subtle`).
- [x] Implemented PBKDF2 600,000 iterations key derivation separating `vaultKey` (stays in browser memory) and `authKey` (hashed on server).
- [x] Implemented AES-256-GCM encryption/decryption with fresh 12-byte IVs.
- [x] Built cryptographically secure password generator and strength evaluator.
- [x] Built RFC 6238 TOTP authenticator with live 30-second countdown.

### Phase 3: Zero-Knowledge Server Functions & Custom Auth ✅
- [x] Created [src/server/auth.ts](file:///d:/projects/1password-clone/src/server/auth.ts) with pre-login salt exchange, registration, login, logout, and session check.
- [x] Enforced that the server never receives or handles master passwords in plaintext.

### Phase 4: Encrypted Vault Server Functions ✅
- [x] Created [src/server/vault.ts](file:///d:/projects/1password-clone/src/server/vault.ts) for CRUD operations on blind encrypted ciphertexts.
- [x] Implemented batch import server function.

### Phase 5: Client State & Inactivity Auto-Lock ✅
- [x] Created [src/context/VaultContext.tsx](file:///d:/projects/1password-clone/src/context/VaultContext.tsx).
- [x] Stored `vaultKey` and decrypted items strictly in browser memory.
- [x] Integrated global user activity listeners (`mousemove`, `keydown`, `click`, `scroll`) that trigger immediate vault lock and memory wipe after the configured idle timeout (1m, 5m, 15m, 30m, 1h, Never).

### Phase 6: Clean Desktop-Inspired 3-Pane UI ✅
- [x] Left Sidebar: [src/components/Sidebar.tsx](file:///d:/projects/1password-clone/src/components/Sidebar.tsx) with categories, tags, quick lock button, auto-lock selector, generator trigger, and import/export trigger.
- [x] Middle Item List: [src/components/ItemList.tsx](file:///d:/projects/1password-clone/src/components/ItemList.tsx) with instant search, category counts, "+ New" item dropdown, and star indicators.
- [x] Right Detail & Editor: [src/components/ItemDetail.tsx](file:///d:/projects/1password-clone/src/components/ItemDetail.tsx) with 1-click copy buttons, password masking & reveal, live rolling TOTP timer, custom fields builder, and notes.

### Phase 7: Built-in Utilities & Overlays ✅
- [x] Password Generator Modal: [src/components/PasswordGeneratorModal.tsx](file:///d:/projects/1password-clone/src/components/PasswordGeneratorModal.tsx).
- [x] Import / Export Modal: [src/components/ImportExportModal.tsx](file:///d:/projects/1password-clone/src/components/ImportExportModal.tsx) with CSV and JSON file parsing.
- [x] Auth Modal: [src/components/AuthModal.tsx](file:///d:/projects/1password-clone/src/components/AuthModal.tsx) for unlocking and first-time account setup.

### Phase 8: End-to-End Verification ✅
- [x] Full production build tested (`npm run build` exits with code 0).
- [x] Browser subagent ran end-to-end verification (account creation, item creation, copy actions, TOTP generation, locking, and unlocking).
- [x] Database inspection confirmed that `vault.db` only stores encrypted ciphertexts and IVs.
