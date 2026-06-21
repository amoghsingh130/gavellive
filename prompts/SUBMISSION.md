# GavelLive — Submission

> Real-time global auctions where the **database is the hero**. Built on
> **Amazon Aurora DSQL** for the H0 Hackathon (Hack the Zero Stack with Vercel
> v0 + AWS Databases).

---

## Submission links

- **Live app (Vercel):** https://gavellive.vercel.app
- **Vercel Team ID:** `team_eoMiFbLGXTmAn1UJyuQgzbgc`
- **Live API examples:** `GET https://gavellive.vercel.app/api/health/db` ·
  `GET https://gavellive.vercel.app/api/auctions`
- **Architecture diagram:** see `ARCHITECTURE.md`
- **Demo recording script:** see `DEMO_VIDEO_SCRIPT.md`

---

## Elevator pitch (≤ 200 chars)

A live auction house that proves correctness under fire: thousands of concurrent
bids, zero lost writes, exactly one winner — guaranteed by Amazon Aurora DSQL.

---

## Inspiration

A live auction is the textbook hard problem in distributed data: many people
bidding on the same item at the same instant, money on the line, and **no room
for error**. Two bids must never both "win." The price must only go up. The last
bid before the clock hits zero must count. Most demos hand-wave this. We wanted
to *prove* it — on screen — using a database built for exactly this guarantee.

## What it does

GavelLive is a marketplace of timed live auctions. A buyer opens an auction, sees
the current price and countdown updating in real time, places a bid, and is told
instantly whether they're the high bidder or were outbid. Anti-snipe extends the
clock when a bid lands in the final seconds. When the clock hits zero, exactly one
winner is finalized from the source of truth.

Under the hood, every bid runs as a **serializable transaction** with an
optimistic-concurrency retry loop, so the system stays correct no matter how many
people bid simultaneously.

## Who it's for

Sellers running high-demand timed sales (collectibles, sneakers, art, liquidation)
and the buyers competing for them — anywhere a wrong price or a duplicate winner
means lost money and lost trust. The seller-fee / buyer-premium model makes it a
real marketplace business, not just a tech demo.

## Why it matters

Correctness under concurrency is where naive auction apps quietly fail: race
conditions lose bids, admit duplicate winners, or let the price move backward.
GavelLive makes that guarantee its core feature — and ships a load test that
*demonstrates* it rather than asserting it.

## How we built it

- **Frontend:** Next.js (App Router), scaffolded with **v0**, deployed on **Vercel**.
- **Source of truth:** **Amazon Aurora DSQL** — serializable, strongly consistent,
  optimistic concurrency control, accessed from Vercel serverless functions via
  short-lived **IAM auth tokens** (no static passwords).
- **The correctness core (`lib/bids.ts`):** each bid opens a DSQL transaction —
  read auction snapshot → validate (live, not ended, ≥ high + increment) → insert
  bid → update high bid → extend `ends_at` if inside the anti-snipe window →
  COMMIT. DSQL aborts conflicting concurrent commits (SQLSTATE 40001); the handler
  catches it, re-reads, and retries with jittered backoff.
- **Winner finalization:** lazy close-on-read — an atomic, anti-snipe-safe
  conditional UPDATE flips an auction to `ended` the moment its clock runs out.
- **Proof:** a concurrency load test fires hundreds of simultaneous bids at the
  live endpoint, then verifies invariants directly against DSQL.

## Proven, not claimed

300 concurrent bids against the live API on real Aurora DSQL:

| Invariant | Result |
|---|---|
| No lost / duplicate writes (bid rows == accepted) | ✅ |
| Final price == highest accepted bid | ✅ |
| Exactly one winner, and it's the top bidder | ✅ |
| OCC contention actually occurred | 414 retry attempts, max 4 on one bid |

## AWS Databases used

- **Amazon Aurora DSQL** — primary database and source of truth for users,
  auctions, and bids. Chosen for serializable strong consistency and optimistic
  concurrency control, which make correct concurrent bidding provable.
- *(Planned)* **Amazon DynamoDB** — hot-state + bid-event stream for low-latency,
  high-fanout reads and WebSocket push at scale.

## Challenges

- Aurora DSQL is a PostgreSQL *subset*: no FOREIGN KEY constraints, so referential
  integrity is enforced in the app layer with UUID keys.
- Generating per-connection IAM auth tokens from ephemeral serverless functions
  and keeping connections short-lived.
- Designing the OCC retry loop so genuine conflicts retry but business rejections
  (bid too low, auction ended) return immediately.

## What's next

- Real-time **push** via DynamoDB Streams → Lambda fanout over API Gateway
  WebSockets (replacing ~750ms polling).
- **Multi-region active-active** DSQL: bidders in two regions, one consistent price.
- Clerk auth, seller dashboard, payment-capture and email stubs.

## Built with

Next.js · Vercel · v0 · Amazon Aurora DSQL · TypeScript · node-postgres · AWS SDK

---

### Hackathon attribution (for the bonus build blog)

> This project was created for the H0 Hackathon (Hack the Zero Stack with Vercel
> v0 and AWS Databases). #H0Hackathon
