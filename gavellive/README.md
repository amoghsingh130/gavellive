# GavelLive

Real-time global auction house. Next.js (App Router) on Vercel, Aurora DSQL as
the strong-consistency source of truth. See `../handoff.md` and
`../BUILD_STEPS.md` for the full plan.

## Status

Phase 1 foundation — **DB seam verified** ✅ (`GET /api/health/db` returns
`{ ok: true }` against the live DSQL cluster: IAM-token auth, TLS, and a `pg`
query round-trip all confirmed working).

- `src/lib/db.ts` — DSQL connection helper (IAM-token auth, short-lived clients).
- `src/app/api/health/db/route.ts` — `GET /api/health/db` runs `SELECT 1`.
- `db/schema.sql` — defensive, DSQL-aware schema (no FKs; app-enforced integrity).
- `src/lib/types.ts` — domain types mirroring the schema.

Remaining in Phase 1: apply `db/schema.sql` to the cluster (capability spike).
Next: Phase 2 — place-bid transaction + OCC retry loop.

## Run locally

```bash
cp .env.example .env.local   # fill in DSQL + AWS values
npm run dev
```

Then hit http://localhost:3000/api/health/db — expect `{ "ok": true, ... }`.

## Apply the schema

After the Phase 1 capability spike confirms each statement, run `db/schema.sql`
against the cluster, e.g. with a freshly generated IAM token:

```bash
set -a; source .env.local; set +a
PGPASSWORD="$(aws dsql generate-db-connect-admin-auth-token --hostname "$DSQL_ENDPOINT" --region "$AWS_REGION")" \
  psql --host="$DSQL_ENDPOINT" --port=5432 --username=admin --dbname=postgres \
  --set=sslmode=require -f db/schema.sql
```

## Clerk auth (next step — needs keys)

Clerk is installed but not yet wired into the render path, so the app builds and
runs with zero env vars. To activate once you have keys:
1. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.
2. Add `middleware.ts` with `clerkMiddleware()`.
3. Wrap `src/app/layout.tsx` in `<ClerkProvider>`.
4. On first authenticated action, upsert a `users` row keyed by `clerk_id`.
