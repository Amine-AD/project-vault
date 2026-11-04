# Security

## Reporting a vulnerability

Please don't open a public issue. Email the address in
`src/features/website/legal/legal-info.ts` with the details and steps to
reproduce. You'll get a reply within a few days.

## How the vault is protected

- **Your master password never leaves the browser.** It goes through
  Argon2id (64 MiB, 3 passes, 4 lanes) in the browser. Half of the result is
  the *master key*; the other half, hashed, is the *auth key* that signs you
  in. The server bcrypt-hashes the auth key again and can't turn it back into
  the master key.
- **Items are encrypted with a random vault key** (AES-256-GCM), made in the
  browser when the vault is created. The server stores three wrapped copies
  of it, each useless on its own: one locked by the master key, one by the
  recovery key, and one per trusted device (a non-extractable key in that
  browser's IndexedDB). Changing the master password only re-wraps the first
  copy.
- **Everything about an item is encrypted**, including its type, tags and
  favorite flag. The server sees ids, timestamps and ciphertext sizes.
- **The server refuses weak settings.** It won't store KDF settings below
  OWASP's floors, malformed salts or keys, or partial re-encryptions that
  would leave items unreadable (`src/server/validation.ts`).
- **No secrets in the source code.** Values that must be unguessable, such as
  the stand-in salts that hide which emails have a vault, are keyed with a
  per-install secret (`APP_SECRET`, or one generated into the database on
  first run).
- Vaults made with older versions (PBKDF2, or no random vault key) are
  upgraded automatically the next time they're unlocked.

## What a web vault can't protect against: the server's JavaScript

Any password manager that runs as a web page has one built-in limitation:
the browser runs whatever JavaScript the server sends. A compromised or
malicious server could send code that captures the master password as you
type it. Encryption can't fix this, because the attacker controls the code
doing the encryption. 1Password, Bitwarden and Proton have the same
limitation in their web vaults.

What OneVault does about it:

- **Strict Content Security Policy** (production builds, `src/start.ts`):
  only this server's own scripts and inline scripts with a per-response
  nonce run, the page can only connect to its own origin, and it can't be
  framed. An XSS bug therefore can't load outside code or send secrets to
  another site. This protects against injected code. It does **not** protect
  against the server itself being malicious.
- **Self-hosting.** If you run the server yourself, the only server you have
  to trust is yours.
- **Open source.** Anyone can read the code the server is supposed to send.

What would remove the need to trust the server (planned):

- A **browser extension** or **desktop app** whose code is installed once,
  signed, and updated through a store, so a compromised server can't swap
  it out. The web vault would stay as a convenience.
- **Reproducible builds** with published hashes, so anyone can check that a
  hosted instance serves exactly the released code.

If you need protection from a compromised server today, self-host, keep the
server patched, and serve it only over HTTPS.

## Other known limits

- Failed-attempt lockouts are kept in memory and reset on restart.
- Changing the master password doesn't rotate the vault key. Someone who
  already stole the old wrapped key *and* knows the old password could still
  open the vault. Key rotation is planned as a separate action.
- There's no independent audit yet.
