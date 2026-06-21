# GavelLive — app

Next.js (App Router) on Vercel, **Amazon Aurora DSQL** as the strong-consistency
source of truth. Project overview and architecture live in the
[root README](../README.md) and [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Setup

```bash
cp .env.example .env.local   # fill in DSQL endpoint + AWS credentials
npm install
```

`.env.local` needs the Aurora DSQL endpoint and AWS credentials used to mint
short-lived IAM auth tokens (no static DB password). See `.env.example` for the
full list.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run db:push` | Apply `db/schema.sql` to the DSQL cluster |
| `npm run seed` | Reset + seed users and the demo auction floor (writes `.seed.json`) |
| `npm run loadtest` | Fire N concurrent bids at the live endpoint and verify invariants |

> Health check: after `npm run dev`, hit
> [`/api/health/db`](http://localhost:3000/api/health/db) — expect `{ "ok": true }`,
> confirming IAM-token auth + TLS + a `pg` round-trip against the live cluster.

## Key files

- `src/lib/db.ts` — DSQL connection helper (IAM-token auth, short-lived clients).
- `src/lib/bids.ts` — the place-bid serializable transaction + OCC retry + anti-snipe.
- `src/lib/auctions.ts` — reads + lazy close-on-read winner finalization.
- `db/schema.sql` — DSQL-aware schema (no foreign keys; app-enforced integrity).
- `scripts/load-test.mjs` — concurrency proof harness.

## Clerk auth (installed, not yet wired)

Clerk is a dependency but not in the render path, so the app builds and runs with
zero env vars. To activate once you have keys:

1. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.
2. Add `middleware.ts` with `clerkMiddleware()`.
3. Wrap `src/app/layout.tsx` in `<ClerkProvider>`.
4. On first authenticated action, upsert a `users` row keyed by `clerk_id`.
