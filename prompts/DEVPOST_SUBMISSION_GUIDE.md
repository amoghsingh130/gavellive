# GavelLive — Devpost Submission Guide

> Status as of writing: demo video (YouTube), architecture diagram (`diagrams/01-system.png`),
> and Devpost registration are **done**. The only outstanding required asset is the
> **Aurora DSQL console screenshot**. Deadline: **Jun 29, 2026**.

---

## Step 0 — The one blocker: AWS proof screenshot (do this first)

Required by the rules and the only missing asset.

1. Sign in to AWS Console → **Aurora DSQL** (same account as the cluster), region **us-east-1**.
2. Open the cluster so the page shows: **cluster identifier**, **region (us-east-1)**, and
   **status = Active**.
3. Screenshot the panel. Crop/blur the endpoint host and any ARNs/account IDs if cautious —
   judges only need to see the cluster exists, its region, and Active status.
4. Save as `diagrams/dsql-cluster.png`.

> Optional but strong: also screenshot `GET https://gavellive.vercel.app/api/health/db`
> returning green — proves DSQL is reachable **from production**, not just that a cluster exists.

---

## Step 1 — Pre-flight (5 min, before the form)

- Confirm https://gavellive.vercel.app loads and `/auctions` shows the luxury floor.
- Reseed **only** if you want a clean floor for judges: `cd gavellive && npm run seed`
  (the chair lot is on a 75s clock; the Patek + stress panel are the main draw, so this is fine).
- Have ready to paste: YouTube link, `diagrams/01-system.png`, `diagrams/dsql-cluster.png`.

---

## Step 2 — Fill the Devpost form

| Devpost field | What to enter |
|---|---|
| **Project name** | GavelLive |
| **Tagline** (≤200 char) | A live auction house that proves correctness under fire: thousands of concurrent bids, zero lost writes, exactly one winner — guaranteed by Amazon Aurora DSQL. |
| **Full description** | Paste the **Ready-to-paste description** block below. |
| **Built with** (tags) | nextjs, vercel, v0, amazon-aurora-dsql, typescript, node-postgres, aws-sdk |
| **Track / category** | Million-scale global app |
| **Try it out links** | `https://gavellive.vercel.app` · GitHub `https://github.com/amoghsingh130/gavellive` · Vercel Team ID `team_eoMiFbLGXTmAn1UJyuQgzbgc` |
| **Video demo** | https://www.youtube.com/watch?v=VnD1zPqk2Gs (confirm Public or Unlisted, **not** Private) |
| **Image gallery** | Upload `01-system.png` **first** (becomes thumbnail), then `dsql-cluster.png`. |

---

## Step 3 — Critical wording checks (judges are all AWS DB people)

- **AWS Database = Amazon Aurora DSQL.** Name it explicitly (the block below does).
- **Do NOT claim DynamoDB is used** — it's not wired. It appears only under "What's next."

---

## Step 4 — Required-items final check (official rules)

- [ ] Text description naming the AWS Database (Aurora DSQL) — ✅ via block below
- [ ] <3-min demo video, public on YouTube — ✅ (verify not Private)
- [ ] Vercel project link + Team ID — ✅
- [ ] Architecture diagram attached — ✅ `01-system.png`
- [ ] **AWS console screenshot** — ⛔ **do Step 0**

---

## Step 5 — Optional bonus (only if time before Jun 29)

Publish a short build post (dev.to / LinkedIn / builder.aws.com) with `#H0Hackathon` and the
exact required line: **"This project was created for the H0 Hackathon."**

---

## Step 6 — Submit

Devpost lets you **edit after submitting** until the deadline. Submit as soon as Steps 0–2 are
done; add the bonus blog link later if you write one.

---

# Ready-to-paste description (copy this whole block into the Devpost description field)

GavelLive is a real-time luxury auction house for high-demand collectibles — watches, classic cars, jewelry, rare books — where the database is the hero. It's built on Amazon Aurora DSQL for the H0 Hackathon (Hack the Zero Stack with Vercel v0 + AWS Databases).

## Inspiration

A live auction is the textbook hard problem in distributed data: many people bidding on the same item at the same instant, money on the line, and no room for error. Two bids must never both "win." The price must only go up. The last bid before the clock hits zero must count. Most demos hand-wave this. We wanted to prove it — on screen — using a database built for exactly this guarantee.

## What it does

GavelLive is a marketplace of timed live auctions. A buyer opens an auction, sees the current price and countdown updating in real time, places a bid, and is told instantly whether they're the high bidder or were outbid. Anti-snipe extends the clock when a bid lands in the final seconds. When the clock hits zero, exactly one winner is finalized from the source of truth. Under the hood, every bid runs as a serializable transaction with an optimistic-concurrency retry loop, so the system stays correct no matter how many people bid simultaneously.

## How we built it

- Frontend: Next.js (App Router), scaffolded with v0, deployed on Vercel.
- Source of truth: Amazon Aurora DSQL — serializable, strongly consistent, optimistic concurrency control, accessed from Vercel serverless functions via short-lived IAM auth tokens (no static passwords).
- The correctness core (lib/bids.ts): each bid opens a DSQL transaction — read auction snapshot → validate (live, not ended, ≥ high + increment) → insert bid → update high bid → extend ends_at if inside the anti-snipe window → COMMIT. DSQL aborts conflicting concurrent commits (SQLSTATE 40001); the handler catches it, re-reads, and retries with jittered backoff.
- Winner finalization: lazy close-on-read — an atomic, anti-snipe-safe conditional UPDATE flips an auction to ended the moment its clock runs out.
- Proof: a concurrency load test fires hundreds of simultaneous bids at the live endpoint, then verifies invariants directly against DSQL.

## Proven, not claimed

300 concurrent bids against the live API on real Aurora DSQL:
- No lost / duplicate writes (bid rows == accepted responses): ✅
- Final price == highest accepted bid: ✅
- Exactly one winner, and it's the top bidder: ✅
- OCC contention actually occurred: 414 retry attempts, max 4 on one bid

## AWS Databases used

- Amazon Aurora DSQL — primary database and source of truth for users, auctions, and bids. Chosen for serializable strong consistency and optimistic concurrency control, which make correct concurrent bidding provable.
- (Planned) Amazon DynamoDB — hot-state + bid-event stream for low-latency, high-fanout reads and WebSocket push at scale.

## Challenges

- Aurora DSQL is a PostgreSQL subset: no FOREIGN KEY constraints, so referential integrity is enforced in the app layer with UUID keys.
- Generating per-connection IAM auth tokens from ephemeral serverless functions and keeping connections short-lived.
- Designing the OCC retry loop so genuine conflicts retry but business rejections (bid too low, auction ended) return immediately.

## What's next

- Real-time push via DynamoDB Streams → Lambda fanout over API Gateway WebSockets (replacing ~750ms polling).
- Multi-region active-active DSQL: bidders in two regions, one consistent price.
- Clerk auth, seller dashboard, payment-capture and email stubs.

## How to test it (for judges)

No login required. Open https://gavellive.vercel.app, pick a bidder in the header, enter the auction floor, and open the live Patek lot. Place a bid to see the price update; open a second tab, pick a different bidder, and outbid to see real-time outbid feedback. Then scroll to the Concurrency proof panel and run it — it fires hundreds of real concurrent bid transactions at Aurora DSQL and shows throughput, OCC retries, latency, and all correctness invariants holding live.

## Built with

Next.js · Vercel · v0 · Amazon Aurora DSQL · TypeScript · node-postgres · AWS SDK

## Disclaimer

Product images are royalty-free demo assets from Unsplash. Listings are sample data for demonstration purposes only.

This project was created for the H0 Hackathon. #H0Hackathon
