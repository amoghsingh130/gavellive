# GavelLive — H0 Hackathon Handoff

> Handoff for the H0 Hackathon (*Hack the Zero Stack with Vercel v0 + AWS Databases*).
> Status: **Full app built (backend + polished UI), proven, and deployed to production.**
> Remaining: demo video + AWS console screenshot; optional deferred differentiators.

---

## 0. Current state (updated 2026-06-19)

**Live in production:** https://gavellive.vercel.app · Vercel Team ID `team_eoMiFbLGXTmAn1UJyuQgzbgc`

Next.js app lives in `gavellive/` (the project root is its own dedicated git repo;
the home dir is a separate accidental repo — do NOT commit there). No git remote yet.

**Done:**
- ✅ **Phase 1 — Foundation:** Aurora DSQL cluster ACTIVE (single-region us-east-1);
  IAM-token auth from serverless (`src/lib/db.ts`); schema applied (`db/schema.sql`,
  all statements accepted — no FKs, app-enforced integrity); `/api/health/db` green
  **from the deployed Vercel function** (DSQL-from-production confirmed).
- ✅ **Phase 2 — Correctness core:** `src/lib/bids.ts` serializable place-bid txn +
  OCC retry loop + anti-snipe; `POST /api/auctions/[id]/bids`.
- ✅ **Phase 5 — Load test:** `scripts/load-test.mjs` — 300 concurrent bids → 0 lost
  writes, exactly one winner, all invariants hold on real DSQL (414 OCC retries seen).
- ✅ **Read APIs + winner finalization:** `src/lib/auctions.ts`; `GET /api/auctions`,
  `GET /api/auctions/[id]`, `POST /api/auctions/[id]/close` (lazy close-on-read).
- ✅ **Deployed to Vercel** (prod env vars set; Deployment Protection = Only Preview).
- ✅ **UI built — bold light "hybrid" (Kalshi × PrizePicks) design** (replaces the old
  dark v1 and the starter template). Shipped:
  - **Landing page** (`src/app/page.tsx`): oversized hero ("The live auction floor.
    Provably fair."), an auto-rotating **featured showcase** on a 360° spin pedestal,
    a stats strip (300 / 0 / 1 / 414), "How it works", a correctness-proof highlight,
    and a live-lot preview. The floor grid moved to **`/auctions`**.
  - **Design system** (`src/app/globals.css`): light off-white canvas + electric-indigo
    accent, emerald/rose for the financial read, `shadow-card`, all via Tailwind v4
    `@theme` tokens (semantic tokens → theme flips cascade).
  - **Rotatable imagery**: `ImageGallery` (swipe/drag, curated Unsplash via `next/image`),
    `SpinViewer` (CSS-3D 360° drag-to-rotate pedestal with momentum + idle spin),
    `catalog.ts` (no-DDL keyword→media map), `next.config` Unsplash `remotePatterns`.
    Detail page has a **360° / Photos toggle** for the hero lot.
  - **Live DSQL telemetry on the concurrency proof**: `runStress` emits progress
    (throughput, OCC conflicts, p50/p99 latency); the stress route **streams NDJSON**;
    `StressPanel` renders a progress bar, live numbers, and two hand-rolled SVG
    sparklines, then the four invariant checks animate green. Final `StressResult` +
    checks unchanged.
  - Bidder identity is **per-tab** (`useBidder` → sessionStorage) so two tabs hold two
    bidders → real outbid toasts. New components in `src/components/`: `Header`,
    `AuctionCard`, `AuctionDetailClient`, `ImageGallery`, `SpinViewer`,
    `FeaturedShowcase`, `StressPanel`, `CountdownTimer`, `StatusPill`, `Toast`,
    `BidderPicker`, `AuctionImage`.
- ✅ **Redeployed + re-verified on production** (2026-06-20): `/`, `/auctions`, detail
  all 200; `/api/health/db` green; the streaming stress run executes from the deployed
  Vercel function with **all 4 invariants holding** against live DSQL.
- ✅ **Submission assets drafted:** `ARCHITECTURE.md`, `SUBMISSION.md`. (Both predate the
  new landing + live telemetry — refresh before final submission.)
- npm scripts: `db:push`, `seed`, `loadtest` (all use `node --env-file=.env.local`).
  Demo reset: wipe (`DELETE FROM bids/auctions/users`) then `npm run seed` — short-clock
  lots expire and the stress run bids up the Patek, so re-seed for a clean floor.

**Decisions settled since planning:** Auth = **Clerk** (installed, NOT yet wired —
build/dev run with zero env vars; activation steps in `gavellive/README.md`).
DSQL = single-region us-east-1. Deadline "weeks out" (Phase 4 push in scope).
**v0 is OPTIONAL per official rules** — mandatory reqs are AWS DB (✅ DSQL) + deploy on
Vercel **or** v0 (✅ Vercel). Both already met; UI can be hand-built, no v0 needed.

**Next (highest ROI):** record the **<3-min demo video** (problem → app footage:
bidding + outbid toasts + anti-snipe + the live-telemetry concurrency proof → AWS DBs
used) and grab the **DSQL console screenshot**. Then optional deferred differentiators
(see `UI_BUILD_PLAN.md` brainstorm): multi-region active-active DSQL, DynamoDB Streams →
Lambda → WebSocket push fanout, audit ledger, "as-of" time-travel reads, chaos injection,
seller create-auction flow, Stripe stub, build blog (`#H0Hackathon`). Clerk is installed
but still not wired.

**Credits:** request form submitted 2026-06-19 (Track 3). $100 AWS credits expire
**Dec 31 2026**; $30 v0 credits expire **July 13 2026** (codes go to asingh3206@gatech.edu;
redeem AWS code in the same account as the DSQL cluster). Verify Devpost registration
is complete or the request is declined.

---

## 1. Decisions locked

| Decision | Value |
|---|---|
| **Idea** | **GavelLive** — real-time global auction house |
| **Track** | Track 3 — **Million-scale global** (gaming/social/entertainment) |
| **Registration form answer** | "What kind of application are you most likely to build?" → **Global-scale data-intensive app** |
| **Primary database (hero)** | **Aurora DSQL** (strong-consistency source of truth) |
| **Secondary database** | **DynamoDB** (real-time fanout + hot-state reads at scale) — optional/phase-2 |
| **Frontend** | Next.js (App Router), scaffolded with **v0**, deployed on **Vercel** |
| **Builder context** | Solo, comfortable with AWS |
| **Deadline** | TBD — user reports a date later than the listed Jun 29 2026; plan is phased to land either way |
| **Secondary prize target** | **Best Technical Implementation** (cross-cutting, judged across all tracks) |

---

## 2. Why this wins

Every one of the 10 judges is an **AWS Databases PM/SA**. Judging criteria explicitly reward a *"deliberate data model and architecture"* and *"shippable software, not just demos."*

GavelLive makes the **database the hero**:
- A live auction is a textbook **correctness-under-concurrency** problem — concurrent bids, no lost/duplicate writes, monotonic price, exactly one winner, anti-sniping → **Aurora DSQL** (serializable, strong consistency, OCC, multi-region active-active).
- It's also a **planet-scale read-fanout** problem (many watchers per hot auction) → **DynamoDB** (low-latency, high-fanout reads).

**The demo can *prove* correctness on screen** (fire thousands of concurrent bids → zero lost, one winner). That visual proof is rare and unforgettable to a DB-judge panel.

**Track/competition rationale:** Track 3 is less saturated than B2C/B2B clones and aligned with judge expertise (scale = their products). The 4 cross-cutting prizes (Best Technical Implementation, Best Design, Most Impactful, Most Original — $2k cash + $2k credits each) are judged across *all* tracks, so entering Track 3 keeps "Best Technical Implementation" in play. Monetization framing (seller fees / buyer premium) keeps the writeup "shippable," not just a tech demo.

---

## 3. The product (MVP scope)

A marketplace of timed live auctions. A buyer opens an auction, sees the current price + time remaining updating in real time, places a bid, and is immediately told if they're high bidder or outbid. Anti-snipe extends the clock on last-second bids. When the clock hits zero, exactly one winner is determined from the source of truth.

**Must-have (MVP):**
- Auth (Clerk or Auth.js).
- Auction list + auction detail page (live price, high bidder, countdown, bid history).
- **Place-bid transaction on Aurora DSQL** — the correctness core.
- Anti-snipe (extend `ends_at` if bid within last N seconds).
- Auction close + winner determination from DSQL.
- Real-time price updates to watchers (polling first, upgrade to push).

**Differentiators (these win):**
- **Concurrency load-test demo** proving zero lost/duplicate bids under thousands of concurrent writers, with DSQL OCC retry metrics shown.
- **Real-time WebSocket fanout** (AWS-native: API Gateway WebSocket + Lambda, or AppSync subscriptions).
- **DynamoDB hot-state + bid event stream** for scale reads, fed by DynamoDB Streams → Lambda fanout.
- **Multi-region DSQL active-active** demo (bidders in two regions, one consistent price).

**Polish / "shippable" signals:** cohesive design system, outbid toast notifications, watch/favorite, seller dashboard, payment-capture stub, transactional email stub.

---

## 4. Architecture

```
v0-scaffolded Next.js (App Router) ── deployed on Vercel
        │  write path (place bid)                    │  real-time read path
        ▼                                            ▼
  Route Handler / Server Action            WebSocket client (API GW WS or AppSync)
        │  serializable txn                          ▲
        ▼                                            │ fanout on each bid
  ┌─────────────────────┐   on commit   ┌────────────────────────────┐
  │ Aurora DSQL          │ ────────────▶ │ DynamoDB                    │
  │ (source of truth):   │               │ - auction hot-state item    │
  │ auctions, bids,      │               │ - bid event stream          │
  │ winner, anti-snipe   │               │ - WS connection registry    │
  └─────────────────────┘               └──────────┬─────────────────┘
   strong consistency, OCC                          │ DynamoDB Streams
   multi-region active-active             Lambda fanout → post to WS connections
```

- **Write (place bid):** Next.js Route Handler → DSQL transaction (validate `bid > current_high + increment`, insert bid, update high bid, maybe extend `ends_at`). On commit, upsert DynamoDB hot-state item + append bid event.
- **Read (real-time):** clients subscribe via WebSockets; DynamoDB Streams on the bid event table triggers a Lambda that posts updates to all connections watching that auction. **MVP fallback:** poll the DynamoDB hot-state item every ~750ms.
- **Close:** EventBridge-scheduled Lambda (or lazy close-on-read) finalizes the winner from DSQL.
- **Why two DBs:** DSQL = money-critical correctness; DynamoDB = cheap, low-latency, high-fanout reads. Rules require *at least one* of the three DBs; using two is a legitimate plus. **DSQL is the hero; DynamoDB is optional/phase-2** so MVP can ship on DSQL + polling if time is tight.

---

## 5. Data model

**Aurora DSQL (PostgreSQL subset — source of truth):**
- `users(id, email, display_name, created_at)`
- `auctions(id, seller_id, title, description, image_url, starting_price, bid_increment, reserve_price, current_high_bid, current_high_bidder_id, status, starts_at, ends_at, created_at)`
- `bids(id, auction_id, bidder_id, amount, created_at)` — append-only
- **Place-bid transaction** (craftsmanship centerpiece): read auction row → assert `status='live'`, `now < ends_at`, `amount >= current_high_bid + bid_increment` → insert bid → update `current_high_bid/bidder` → if `ends_at - now < anti_snipe_window` then `ends_at = now + anti_snipe_extension`. DSQL's OCC aborts conflicting concurrent commits → **retry with backoff** in the handler. The retry loop + correctness guarantee is the demo/blog story.

**DynamoDB (scale/fanout):**
- Hot-state item per auction (`PK=AUCTION#<id>`): current price, high bidder, `ends_at`, status.
- Bid event items (append) with **DynamoDB Streams** enabled → drives fanout Lambda.
- WS connection registry (`PK=AUCTION#<id>`, `SK=CONN#<connId>`) with TTL.

---

## 6. Build phases (re-sequenceable to actual deadline)

1. **Foundation:** Next.js scaffold via **v0** (auction list + detail + bid UI). Provision **Aurora DSQL**; wire IAM-token auth from Vercel env vars via `pg`. Deploy to Vercel early; confirm DSQL connectivity from a deployed Route Handler.
2. **Correctness core:** place-bid DSQL transaction + OCC retry loop + anti-snipe + winner finalization. Unit-test the transaction logic.
3. **Real-time (polling first):** DynamoDB hot-state item written on commit; client polls it. Ship working end-to-end live auction.
4. **Scale + push:** DynamoDB Streams → Lambda fanout over API Gateway WebSockets (or AppSync subscriptions). Replace polling with push.
5. **The winning demo:** concurrency load-test script (`k6`/`autocannon` or a Node script firing N concurrent bids) proving zero lost/duplicate bids + one winner; capture DSQL retry metrics. Optional: multi-region DSQL active-active.
6. **Polish + shippability:** design system pass, outbid notifications, seller dashboard, payment/email stubs.
7. **Submission assets:** <3-min demo video, architecture diagram, AWS console screenshots (DSQL cluster + DynamoDB table), Vercel project link + Team ID. **Bonus content:** publish a build blog (dev.to / builder.aws.com / LinkedIn) with `#H0Hackathon` and the required "created for this hackathon" language.

**If deadline is effectively Jun 29:** compress to Phases 1–3 + 5 + 7 (drop push fanout and multi-region to "future work" in the writeup). With weeks/months: execute all phases including multi-region DSQL.

---

## 7. Key risks & gotchas (validate early)

- **DSQL is a PostgreSQL *subset*.** Verify support for sequences/identity, foreign keys, isolation semantics, and DDL limits *before* finalizing the schema — design around generated UUID PKs and app-level integrity.
- **DSQL IAM auth from serverless:** connections use short-lived IAM auth tokens, not static passwords. Generate the token per connection (AWS SDK), keep connections short-lived, confirm pooling behavior from Vercel functions.
- **Vercel + long-lived WebSockets:** Vercel serverless doesn't hold WS connections — that's why fanout lives in AWS (API GW WS / AppSync). Don't host the socket on Vercel. Polling fallback de-risks the real-time path.
- **Anti-snipe + load-test interaction:** the load test must assert invariants (final price == max valid bid, exactly one `current_high_bidder`, bid count == accepted writes) — that assertion *is* the demo's punchline.
- Confirm repo public/private before pushing; build-verify (`npm run build`) before declaring milestones done; shell-quote AWS secrets carefully.

---

## 8. Submission checklist (from official rules)

- [ ] Text description naming the AWS Database(s) used
- [ ] <3-min demo video (YouTube preferred): problem → who → why → working app footage → AWS DBs used
- [ ] Published Vercel project link + Vercel Team ID
- [ ] Architecture diagram (project → back-end components)
- [ ] Screenshot proving AWS Database usage (DSQL cluster / DynamoDB table in console)
- [ ] (Bonus) Published content with `#H0Hackathon` + "created for this hackathon" language

## 8.5 Final Devpost submission package

Use these exact fields/assets unless the app changes again before submission.

| Field | Use |
|---|---|
| **Project name** | **GavelLive** |
| **Track** | **Million-scale global app** |
| **Published Vercel project link** | https://gavellive.vercel.app |
| **Vercel Team ID** | `team_eoMiFbLGXTmAn1UJyuQgzbgc` |
| **AWS Database used** | **Amazon Aurora DSQL** |
| **Architecture diagram** | `ARCHITECTURE.md` — export/screenshot the diagram and attach it |
| **Demo video script** | `DEMO_VIDEO_SCRIPT.md` — record, upload publicly to YouTube, keep under 3 minutes |
| **Main submission copy** | `SUBMISSION.md` |

**Important wording:** Do **not** claim DynamoDB is used in the final submission unless it is
actually wired before the deadline. Mention DynamoDB only as future work. The implemented
database story is Aurora DSQL as the source of truth.

**Short pitch:**

> GavelLive is a live luxury auction platform where Amazon Aurora DSQL guarantees
> correct bidding under concurrency: zero lost writes, monotonic prices, and exactly
> one winner.

**Testing instructions for judges:**

> No login required. Open the app, use the bidder picker in the header, enter the
> auction floor, open the live Patek lot, place bids, and run the in-app concurrency
> proof panel.

**AWS proof screenshot:**

- Take a screenshot of the Aurora DSQL cluster in AWS Console.
- Show the cluster/resource exists, region, and status.
- Hide anything secret.
- This screenshot is mandatory proof of AWS Database usage.

**Bonus content:**

- Publish a short dev.to / Medium / LinkedIn / builder.aws.com post.
- Include `#H0Hackathon`.
- Include this exact required language:

> This project was created for the H0 Hackathon.

**Final submission order of operations:**

1. Confirm https://gavellive.vercel.app loads and `/auctions` shows the corrected luxury catalog.
2. Reseed only if you explicitly want a fresh clean floor; reseeding deletes demo users,
   auctions, and bids.
3. Record the demo using `DEMO_VIDEO_SCRIPT.md`.
4. Upload the demo publicly to YouTube.
5. Capture the Aurora DSQL console screenshot.
6. Export/screenshot the architecture diagram from `ARCHITECTURE.md`.
7. Fill Devpost using `SUBMISSION.md`, the Vercel link, the Team ID, the YouTube link,
   the architecture diagram, and the AWS screenshot.

---

## 9. Open items

- ~~Confirm deadline~~ → "weeks out" (Phase 4 push in scope, multi-region optional).
- ~~Complete v0/AWS credits request form~~ → submitted 2026-06-19. Still TODO: confirm
  Devpost registration is complete; redeem codes when they arrive.
- ~~Decide auth provider~~ → **Clerk** (installed; wire when keys available).
- Choose real-time transport: API Gateway WebSockets vs AppSync subscriptions (Phase 4, if reached).
- ~~Build the UI~~ → **done** (bold light redesign + landing + rotatable imagery + live
  telemetry; deployed + re-verified on prod). Remaining: record demo video + grab AWS
  console screenshot. Deferred differentiators tracked in `UI_BUILD_PLAN.md`.
