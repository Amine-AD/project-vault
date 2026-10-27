# Project Overview: Open-Source Zero-Knowledge Password Manager

An open-source, self-hostable, zero-knowledge password manager inspired by 1Password. Designed for personal use, local running, and lightweight self-hosting via Docker or Node.js.

---

## 1. Core Principles & Philosophy

1. **Zero-Knowledge by Design**: The server never sees the user's master password, the vault decryption key, or decrypted item contents. If the database or server is completely compromised, all vault secrets remain impenetrable.
2. **Local-First & Self-Hostable**: Single-command startup with zero cloud dependencies. Uses an embedded SQLite database (`vault.db`) in WAL mode for effortless single-file backups and migrations.
3. **Clean, Authentic UI**: A functional, high-utility 3-pane layout (Navigation $\rightarrow$ Item List $\rightarrow$ Item View/Edit) inspired by native macOS/desktop password managers. Prioritizes accessibility, instant search, copy shortcuts, and avoids generic AI-template aesthetics.
4. **End-to-End Type Safety**: Built with TanStack Start, TanStack Router, and Drizzle ORM for strict end-to-end type safety between database, server functions, and client UI.

---

## 2. Security & Cryptographic Architecture

```
[User Master Password] + [Unique User Salt]
                 │
                 ▼  (PBKDF2-HMAC-SHA256, 600,000 iterations via Web Crypto API)
       ┌─────────────────────────┴─────────────────────────┐
       ▼                                                   ▼
[Vault Encryption Key] (256-bit)                [Auth Key Material] (256-bit)
(AES-GCM key in browser memory only)                       │
       │                                                   ▼  (SHA-256 Digest)
       │                                              [Auth Key] (Sent over HTTPS)
       │                                                   │
       ▼                                                   ▼
[Encrypt / Decrypt Items locally]               [Server: bcrypt.hash / verify]
(AES-256-GCM with fresh 12-byte IV)             [Issues HttpOnly Session Cookie]
```

### Key Derivation & Handshake (Pre-Login)
- **Step 1 (Pre-login)**: The client sends `{ email }` to `/api/auth/prelogin`. The server returns the user's unique KDF salt and iteration count. (If user does not exist, a deterministic salt is generated to prevent email enumeration).
- **Step 2 (Client KDF)**: The browser executes `PBKDF2-HMAC-SHA256` with 600,000 iterations on the user's Master Password + Salt, generating 512 bits:
  - **First 256 bits**: `VaultKey` (AES-GCM). Stored strictly in React state/memory while unlocked. Never touches disk or localStorage.
  - **Second 256 bits**: Hashed with SHA-256 to create the `AuthKey`.
- **Step 3 (Authentication)**: The client sends `{ email, authKey }` to `/api/auth/login`. The server verifies `bcrypt.compare(authKey, user.authHash)` and establishes an `httpOnly`, `SameSite=Lax` session cookie.

### Item Encryption & Decryption
- All item titles, usernames, passwords, URLs, notes, custom fields, and TOTP secrets are encrypted client-side using **AES-256-GCM** with a cryptographically secure random 12-byte IV (`window.crypto.getRandomValues`).
- The database only stores opaque ciphertexts: `{ iv: base64, ciphertext: base64 }`.

### Auto-Lock Mechanism
- A global activity listener detects user inactivity (`mousemove`, `keydown`, `focus`, `click`).
- When idle time exceeds the configured timeout (e.g., 5 min, 15 min, 30 min, 1 hour), the client wipes the `vaultKey` and all decrypted records from memory and presents the Master Password unlock screen.

---

## 3. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **TanStack Start** (React 19, Vinxi, Nitro) | Type-safe routing, RPC-style `createServerFn`, modern full-stack performance |
| **Database** | **SQLite** (`better-sqlite3`) | Zero-config, single `.db` file, instant local setup & trivial backup |
| **ORM** | **Drizzle ORM** | Lightweight, type-safe SQL query builder and schema management |
| **Cryptography** | **Native Web Crypto API** (`SubtleCrypto`) | Hardware-accelerated PBKDF2 & AES-256-GCM directly in browser |
| **2FA / TOTP** | **`otpauth`** | RFC 6238 compliant TOTP generator with live countdown interval |
| **Styling & UI** | **Tailwind CSS v4 + Lucide Icons** | Purposeful, responsive, clean desktop-grade layout with dark/light theme |

---

## 4. Data Models (Drizzle SQLite)

### `users`
- `id` (TEXT, PK): Unique UUID
- `email` (TEXT, Unique): User's login email
- `salt` (TEXT): Base64 16-byte random salt for PBKDF2
- `auth_hash` (TEXT): bcrypt hash of client's derived `authKey`
- `kdf_iterations` (INTEGER): Default `600000`
- `created_at` (INTEGER): Unix timestamp
- `updated_at` (INTEGER): Unix timestamp

### `sessions`
- `id` (TEXT, PK): UUID
- `user_id` (TEXT, FK): References `users.id`
- `token` (TEXT, Unique): Cryptographically random session identifier
- `expires_at` (INTEGER): Expiry timestamp
- `created_at` (INTEGER): Unix timestamp

### `vault_items`
- `id` (TEXT, PK): UUID
- `user_id` (TEXT, FK): References `users.id`
- `type` (TEXT): `'login'` | `'note'`
- `encrypted_data` (TEXT): JSON string `{ iv: string, ciphertext: string }`
- `is_favorite` (INTEGER): `0` or `1`
- `tags` (TEXT): JSON array string `["work", "finance"]`
- `created_at` (INTEGER): Unix timestamp
- `updated_at` (INTEGER): Unix timestamp

---

## 5. Deployment & Open-Source Distribution

1. **Local Run**:
   ```bash
   npm install
   npm run dev
   ```
2. **Production / Self-Hosted**:
   - Compiles via `npm run build` into a standalone Node/Nitro server.
   - Run directly with `node .output/server/index.mjs` or with a single-container `Dockerfile`.
   - Data persists in `./vault.db`.
