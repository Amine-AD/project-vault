# Contributing to OneVault

Thanks for helping. OneVault is a password manager, so the bar for changes
that touch encryption, sign-in or recovery is high. Small, focused pull
requests get reviewed fastest.

## Before you start

- **Bugs:** open an issue with steps to reproduce. Never paste a real master
  password, recovery key or vault export.
- **Security problems:** don't open a public issue. See
  [SECURITY.md](SECURITY.md).
- **New features:** open an issue first to discuss it, so you don't spend
  time on something that won't be merged.

## Development

```bash
npm install
cp .env.example .env   # emails are printed to the terminal if RESEND_API_KEY is empty
npm run dev            # http://localhost:3000
```

Before opening a pull request:

```bash
npx tsc --noEmit       # types
npm run check          # Biome lint and format
npm run build          # production build
```

Then go through the parts of [docs/TESTING.md](docs/TESTING.md) your change
touches. If it changes key derivation, encryption, recovery or what the
server stores, also update [SECURITY.md](SECURITY.md) and test section 21
(upgrading vaults made by older versions).

## Licensing of contributions

OneVault is licensed under the [AGPL-3.0](LICENSE). Before your first pull
request can be merged, you'll be asked to sign the
[Contributor License Agreement](CLA.md) by posting a one-line comment; a bot
walks you through it. You keep the copyright in your work. The agreement
lets the project offer OneVault under other licenses too (for example to
fund development), while every contribution stays available under the
AGPL-3.0 in this repository.

The OneVault name and logo aren't covered by the code license; see
[TRADEMARK.md](TRADEMARK.md).
