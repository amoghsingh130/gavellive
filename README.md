# GavelLive

**Real-time luxury auction house where the database is the hero.** Hundreds of
people can bid on the same lot at the same instant — GavelLive proves, on screen,
that every bid is correct: zero lost writes, a price that only moves up, and
exactly one winner. That guarantee comes from **Amazon Aurora DSQL**.

> Built for the **H0 Hackathon** (Hack the Zero Stack with Vercel v0 + AWS Databases).

🔗 **Live app:** https://gavellive.vercel.app
&nbsp;·&nbsp; 🎬 **Demo video:** https://www.youtube.com/watch?v=VnD1zPqk2Gs
&nbsp;·&nbsp; **Health check:** [`/api/health/db`](https://gavellive.vercel.app/api/health/db)
&nbsp;·&nbsp; **Auctions API:** [`/api/auctions`](https://gavellive.vercel.app/api/auctions)

---

## Why it's interesting

A live auction is the textbook hard problem in distributed data: many writers,
one shared piece of state, money on the line, and **no room for error**. Two bids
must never both win. The price must only go up. The last bid before the clock hits
zero must count.

Most demos hand-wave this. GavelLive makes correctness its core feature and ships
a load test that **demonstrates** it instead of asserting it.

## The correctness core

Every bid runs as a single **serializable transaction** on Aurora DSQL
([`gavellive/src/lib/bids.ts`](gavellive/src/lib/bids.ts)):

```
BEGIN
  read auction snapshot
  validate  (live · not ended · amount ≥ high + increment)
  insert bid
  update high bid + bidder
  extend ends_at if inside the anti-snipe window
COMMIT
```

Aurora DSQL uses **optimistic concurrency control** — no row locks. When two bids
race, DSQL aborts whichever commit would break serializability (SQLSTATE `40001`);
the handler catches it, re-reads the now-higher price, and retries with jittered
backoff. Business rejections (bid too low, auction ended) return immediately.

## Proven, not claimed

300 concurrent bids fired at the **live** endpoint, with invariants verified
directly against DSQL ([`gavellive/scripts/load-test.mjs`](gavellive/scripts/load-test.mjs)):

| Invariant | Result |
|---|---|
| No lost / duplicate writes (bid rows == accepted responses) | ✅ |
| Final price == highest accepted bid | ✅ |
| Exactly one winner, and it's the top bidder | ✅ |
| OCC contention actually occurred | 414 retry attempts, max 4 on one bid |

The same proof runs in-app: open the Patek lot and hit the **Concurrency proof**
panel to watch real DSQL transactions race and every invariant turn green.

## Architecture

Browser → Next.js route handlers on Vercel → Aurora DSQL (single source of truth),
over IAM-token auth and TLS. Full diagram and data model in
[`ARCHITECTURE.md`](ARCHITECTURE.md); rendered images in [`diagrams/`](diagrams/).

```
Next.js (App Router) on Vercel
   ├─ POST /api/auctions/:id/bids   → lib/bids.ts   (serializable txn + OCC retry + anti-snipe)
   ├─ GET  /api/auctions(/:id)      → lib/auctions.ts (reads + lazy close-on-read)
   └─ POST /api/auctions/:id/close  → winner finalization
                          │  IAM-token auth · TLS
                          ▼
                   Amazon Aurora DSQL  (users · auctions · bids)
```

## Tech stack

Next.js (App Router) · Vercel · v0 · **Amazon Aurora DSQL** · TypeScript ·
node-postgres · AWS SDK

## Run locally

The app lives in [`gavellive/`](gavellive/). See
[`gavellive/README.md`](gavellive/README.md) for full setup.

```bash
cd gavellive
cp .env.example .env.local   # fill in DSQL endpoint + AWS creds
npm install
npm run db:push              # apply schema to the cluster
npm run seed                 # seed users + the demo auction floor
npm run dev                  # http://localhost:3000
npm run loadtest             # fire the concurrency proof from the CLI
```

## Repo layout

| Path | What's there |
|---|---|
| [`gavellive/`](gavellive/) | The Next.js application (app, API routes, lib, scripts) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System diagram, place-bid sequence, data model |
| [`diagrams/`](diagrams/) | Rendered architecture diagrams (Mermaid source + PNG) |
| [`prompts/`](prompts/) | Build notes, planning docs, demo script, and submission prep |

---

*This project was created for the H0 Hackathon. #H0Hackathon*
