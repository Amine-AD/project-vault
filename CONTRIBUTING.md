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
server stores, also update [SECURITY.md](SECURITY.md). Changes to what's
stored need a migration (see below).

## Changing the database

`src/db/schema.ts` is the only definition of the database. To change it:

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate -- --name short_description`. This writes a
   numbered SQL migration to `drizzle/`. Read it before committing.
3. Restart the app: it applies pending migrations on startup, in order.
4. Commit the schema change and the new files in `drizzle/` together.

Never edit, rename or delete a migration once it's been released:
self-hosted installs have already run it. Fix mistakes with a new
migration. `npm run db:check` checks the migration files are consistent.

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
