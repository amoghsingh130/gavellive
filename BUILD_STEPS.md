# GavelLive — Build & Submission Steps

Extracted from `handoff.md`. Phases are re-sequenceable based on actual deadline.

---

## Phase 1: Foundation

- [ ] Scaffold Next.js app via **v0** (auction list + detail + bid UI)
- [ ] Provision **Aurora DSQL** cluster
- [ ] Wire IAM-token auth from Vercel env vars via `pg` client
- [ ] Deploy to Vercel early
- [ ] Confirm DSQL connectivity from a deployed Route Handler

---

## Phase 2: Correctness Core

- [ ] Implement place-bid DSQL transaction
  - Read auction row → assert `status='live'`, `now < ends_at`, `amount >= current_high_bid + bid_increment`
  - Insert bid row
  - Update `current_high_bid` and `current_high_bidder_id`
  - Anti-snipe logic: if `ends_at - now < anti_snipe_window`, extend `ends_at = now + anti_snipe_extension`
- [ ] Add OCC (Optimistic Concurrency Control) retry loop with backoff in the handler
- [ ] Implement winner finalization logic
- [ ] Unit-test the transaction logic for correctness

---

## Phase 3: Real-Time (Polling First)

- [ ] Create DynamoDB hot-state item per auction (`PK=AUCTION#<id>`)
- [ ] Write hot-state item on each successful bid commit
- [ ] Implement client polling (~750ms interval) for real-time updates
- [ ] Ship working end-to-end live auction (read price, high bidder, countdown)

---

## Phase 4: Scale & Push (Real-Time WebSocket Fanout)

- [ ] Enable **DynamoDB Streams** on bid event table
- [ ] Build Lambda fanout function triggered by DynamoDB Streams
- [ ] Choose real-time transport: API Gateway WebSockets OR AppSync subscriptions
- [ ] Implement WS connection registry in DynamoDB (`PK=AUCTION#<id>`, `SK=CONN#<connId>`) with TTL
- [ ] Replace polling with push notifications to connected clients

---

## Phase 5: The Winning Demo

- [ ] Write concurrency load-test script (`k6`, `autocannon`, or Node.js)
  - Fire N concurrent bids at a single auction
  - Capture DSQL OCC retry metrics
- [ ] Verify invariants:
  - Zero lost or duplicate bids
  - Final price == max valid bid
  - Exactly one `current_high_bidder`
  - Bid count == number of accepted writes
- [ ] **(Optional)** Multi-region DSQL active-active demo (bidders in two regions, one consistent price)

---

## Phase 6: Polish & Shippability

- [ ] Design system pass (cohesive UI)
- [ ] Outbid toast notifications
- [ ] Watch/favorite auction feature
- [ ] Seller dashboard
- [ ] Payment-capture stub (not real)
- [ ] Transactional email stub (not real)

---

## Phase 7: Submission Assets

- [ ] **Text description** naming the AWS Database(s) used (Aurora DSQL, DynamoDB)
- [ ] **Demo video** (<3 min, YouTube preferred):
  - Problem statement
  - Who this is for
  - Why it matters
  - Working app footage
  - AWS databases used
- [ ] **Published Vercel project** link + Vercel Team ID
- [ ] **Architecture diagram** (project → back-end components)
  - Show: v0 Next.js → Route Handler → Aurora DSQL ↔ DynamoDB ↔ Lambda fanout ↔ WebSocket clients
- [ ] **Screenshot** proving AWS Database usage (DSQL cluster, DynamoDB table in console)
- [ ] **(Bonus)** Published content (dev.to, builder.aws.com, LinkedIn) with `#H0Hackathon` + "created for this hackathon" language

---

## Key Risks & Validation (do early)

- [ ] **DSQL is a PostgreSQL subset**
  - Verify: sequences/identity, foreign keys, isolation semantics, DDL limits
  - Design around generated UUID PKs + app-level integrity if needed
- [ ] **DSQL IAM auth from serverless**
  - Use short-lived IAM auth tokens, not static passwords
  - Generate token per connection (AWS SDK)
  - Keep connections short-lived
  - Confirm connection pooling behavior from Vercel functions
- [ ] **Vercel + long-lived WebSockets**
  - Vercel serverless cannot hold WS connections
  - Fanout must live in AWS (API GW WS / AppSync)
  - Polling fallback de-risks the real-time path
- [ ] **Anti-snipe + load-test interaction**
  - Load test must verify invariants (final price, one bidder, bid count)
  - This *is* the demo's punchline
- [ ] **Pre-submission checklist**
  - [ ] Confirm repo is public/private as intended
  - [ ] Run `npm run build` before declaring milestones done
  - [ ] Shell-quote AWS secrets carefully in CLI commands
  - [ ] Confirm actual deadline date (drives phase sequencing)

---

## Data Model

### Aurora DSQL (PostgreSQL subset — source of truth)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  starting_price DECIMAL NOT NULL,
  bid_increment DECIMAL NOT NULL,
  reserve_price DECIMAL,
  current_high_bid DECIMAL,
  current_high_bidder_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'live', -- 'live', 'closed', 'ended'
  starts_at TIMESTAMP,
  ends_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  bidder_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### DynamoDB (scale/fanout — optional/Phase 2+)
- **Hot-state item** per auction: `PK=AUCTION#<id>`, attributes: current_price, high_bidder, ends_at, status
- **Bid event items** (append-only) with Streams enabled
- **WS connection registry**: `PK=AUCTION#<id>`, `SK=CONN#<connId>`, TTL-enabled

---

## If deadline is Jun 29, 2026

Compress to: **Phases 1–3 + 5 + 7** (drop push fanout + multi-region → "future work" in writeup).

---

## Open Items / Decisions Pending

- [ ] Confirm actual deadline date
- [ ] Complete v0/AWS credits request form (answer: *Global-scale data-intensive app*)
- [ ] Choose auth provider: Clerk vs Auth.js
- [ ] Choose real-time transport: API Gateway WebSockets vs AppSync subscriptions (Phase 4 decision)
