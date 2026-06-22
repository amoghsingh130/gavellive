# GavelLive

**A real-time live-commerce auction platform engineered for global scale — where
the hard part, staying correct under concurrent bids, is proven on screen, not
asserted.**
Collectors compete in live, time-boxed bidding events for high-demand goods —
watches, cars, jewelry, rare books — the same live-drops format that powers
modern entertainment commerce. Serving the traffic is the easy half of
million-scale live commerce; keeping one shared price correct while thousands
write to it at the same instant is the hard half — and that's the half GavelLive
proves, on screen: zero lost writes, a price that only moves up, and exactly one
winner. That guarantee comes from **Amazon Aurora DSQL**.

> Built for the **H0 Hackathon** (Hack the Zero Stack with Vercel v0 + AWS Databases).

<p align="center">
  <a href="https://www.youtube.com/watch?v=IcCN94iFmVs">
    <img src="diagrams/app-screenshot.png" alt="GavelLive — live Patek auction lot with the Concurrency-proof panel; click to watch the demo on YouTube" width="820">
  </a>
  <br>
  <em>▶ Watch the demo</em>
</p>

🔗 **Live app:** https://gavellive.vercel.app
&nbsp;·&nbsp; 🎬 **Demo video:** https://www.youtube.com/watch?v=IcCN94iFmVs
&nbsp;·&nbsp; **Health check:** [`/api/health/db`](https://gavellive.vercel.app/api/health/db)
&nbsp;·&nbsp; **Auctions API:** [`/api/auctions`](https://gavellive.vercel.app/api/auctions)

---

## Why it's interesting

Live commerce — Whatnot, TikTok live drops, real-time bidding events — is one of
entertainment's fastest-growing formats, and it's a brutal distributed-systems
problem the moment it goes global: many writers worldwide, one shared piece of
state, money on the line, and **no room for error**. Two bids must never both win.
The price must only go up. The last bid before the clock hits zero must count.

Here's the thing most "scale" demos miss: throwing more servers at read traffic is
the easy half. The hard half is the **one contended row** every bidder is fighting
over — and that half doesn't get easier with more machines, it gets harder. Get one
lot exactly right under that contention, and you have the primitive that holds for
millions of bidders at once. Get it wrong, and scale just multiplies the lost bids.

Most demos hand-wave this. GavelLive makes correctness its core feature, builds an
architecture designed to scale that drama globally (see
[Scaling to millions](#scaling-to-millions-honestly)), and ships a load test that
**demonstrates** the guarantee instead of asserting it.

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
over IAM-token auth and TLS.

<p align="center">
  <img src="diagrams/01-system.png" alt="GavelLive system architecture: browser → Next.js route handlers on Vercel → Aurora DSQL" width="640">
</p>

Full diagram, place-bid sequence, and data model in
[`ARCHITECTURE.md`](ARCHITECTURE.md); diagram sources in [`diagrams/`](diagrams/).

## Scaling to millions (honestly)

The part that's expensive to get right — the serializable place-bid transaction on
Aurora DSQL — is **built and proven today**, and it's precisely the part that does
*not* get easier as you add bidders. That's the foundation in place.

The horizontal scale-out on top of it is **designed and diagrammed, not yet
claimed as running**: read fanout via DynamoDB Streams → API Gateway WebSockets
(replacing the ~750 ms poll), and multi-region active-active DSQL for one globally
consistent price. [`ARCHITECTURE.md`](ARCHITECTURE.md) draws these as dashed
(planned) vs. solid (built & proven) so there's no ambiguity about what exists.
Today's deployment is single-region `us-east-1`; the write-path correctness
guarantee is unchanged by that roadmap — it's the same one serializable transaction
whether one region or many.

## Tech stack

Next.js (App Router) · Vercel · **Amazon Aurora DSQL** · TypeScript ·
node-postgres · AWS SDK · Tailwind CSS

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

> **Disclaimer:** Product images are royalty-free demo assets from Unsplash.
> Listings are sample data for demonstration purposes only.

*This project was created for the H0 Hackathon. #H0Hackathon*
