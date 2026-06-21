# GavelLive — Luxury Catalog Refresh + Judge ROI Plan

> Current direction: keep the polished light UI and live Aurora DSQL proof, but
> replace the mismatched catalog with a coherent luxury estate-auction floor
> using the user's six provided items and images.

---

## Summary

Do **not** remove pictures. Auction products need images to feel shippable.
Instead, make the catalog feel credible: fewer lots, stronger names, matching
photos, plausible estimates, and copy that supports a premium auction-house
experience.

The technical story remains the main wedge for judges:

> GavelLive is a global live-auction platform where Aurora DSQL guarantees
> exactly one winning bid under heavy concurrency.

Use the new catalog to make the demo feel real, then let the database proof win
the technical score.

---

## Canonical Demo Lots

Use the six user-provided images as the canonical catalog. Prices are demo seed
values, not appraisals.

| Item | App Title | Starting Bid | Bid Increment | Reserve | Estimate |
|---|---:|---:|---:|---:|---:|
| Gold Patek Philippe watch | `Gold Patek Philippe Chronograph, Geneva` | `$48,000` | `$1,000` | `$82,000` | `$90,000-$140,000` |
| Red classic Mustang | `1960s Ford Mustang Coupe, Rangoon Red` | `$28,000` | `$500` | `$42,000` | `$45,000-$65,000` |
| Red/gold antique chair | `Carved Giltwood Velvet Salon Chair` | `$1,200` | `$100` | `$2,400` | `$2,500-$4,500` |
| Diamond pearl brooch | `Art Deco Diamond and Pearl Fan Brooch` | `$6,500` | `$250` | `$12,000` | `$14,000-$22,000` |
| 1970s rangefinder camera | `Ricoh 500 G 35mm Rangefinder Camera` | `$75` | `$10` | `$160` | `$180-$320` |
| Asimov collectible | `Isaac Asimov Foundation Avon Paperback` | `$125` | `$25` | `$350` | `$400-$900` |

Important: do **not** call the Asimov item "first edition magazine" in the app
unless provenance is confirmed. The image appears to be an Avon paperback copy
of *Foundation*, while the true first book edition was the 1951 Gnome Press
hardcover. Use "collectible paperback" unless verified.

---

## Implementation Plan

### 1. Store Local Images

Copy the six images into `gavellive/public/lots/` with stable names:

- `patek-gold-chronograph.jpg`
- `ford-mustang-red.jpg`
- `giltwood-velvet-chair.jpg`
- `diamond-pearl-brooch.jpg`
- `ricoh-500g-rangefinder.webp`
- `asimov-foundation-paperback.jpg`

Use local `/lots/...` URLs in seed data and catalog mappings. This removes the
current dependency on unrelated Unsplash item photos and keeps the demo stable
for judging.

### 2. Refresh Seed Data

Update `gavellive/scripts/seed.mjs` to create exactly these six lots.

Keep:

- 60 named demo users.
- One long-running stress-demo lot for `.seed.json`.
- A mix of ending times so countdowns, ended states, bidding, and stress proof
  still demonstrate well.

Suggested placement:

- Make the Patek the long-running stress-demo lot. It has the highest value and
  strongest visual credibility for "hundreds of global bidders."
- Keep one lot already ended and sold, preferably the Mustang or brooch, to show
  winner-state UI.
- Keep one short-clock lot for anti-snipe, preferably the chair or camera.

### 3. Refresh Catalog Mapping

Update `gavellive/src/lib/catalog.ts` so each title maps to its local image.

Use one-image galleries for now unless additional matching angles are sourced.
The important upgrade is accuracy, not quantity.

Remove or disable 360-degree language for these lots unless the current
single-image `SpinViewer` still reads well in screenshots. A fake 360 affordance
can hurt credibility more than it helps. Default to `ImageGallery` when in
doubt.

### 4. Use Auction-House Copy

Descriptions should sound premium and specific without unsupported claims:

- Patek: "Gold-tone case, chronograph dial, black leather strap, presented on a
  display stand. A high-drama horology lot for the concurrency proof."
- Mustang: "Well-kept classic coupe in red finish with chrome trim and
  collector-driver presence."
- Chair: "Carved frame, red velvet upholstery, gilt-toned detailing, and an
  ornate salon silhouette."
- Brooch: "Fan-form setting with diamond accents and a pendant pearl drop,
  photographed against black fabric."
- Camera: "1970s compact 35mm rangefinder with fixed lens and original body
  styling."
- Foundation: "Vintage Avon paperback copy of Asimov's landmark science-fiction
  work, selected for collectible-book bidding."

### 5. Add Attribution / Demo Safety Note

Add a short note in submission materials, not necessarily in the UI:

> Catalog images are licensed/public-domain/demo images used for hackathon
> purposes. Auction prices are seeded demo estimates, not appraisals.

If exact photographer credits are known from filenames, include them in
`SUBMISSION.md` or a small `IMAGE_CREDITS.md`.

---

## Judge ROI Priorities

### Highest ROI

1. **Demo video**
   - Under 3 minutes.
   - Show app first, then architecture, then the stress proof.
   - Do not read a README.

2. **Catalog credibility**
   - Replace mismatched photos/names before recording.
   - This is the biggest design polish lift for the least engineering risk.

3. **Submission docs**
   - Refresh `SUBMISSION.md` and `ARCHITECTURE.md` so they mention:
     - Aurora DSQL as the intentional correctness database.
     - Serializable bid transaction.
     - OCC retry behavior.
     - Anti-snipe.
     - Live stress telemetry.
     - Zero lost writes / exactly one winner.

4. **Bonus content**
   - Publish one public build post before the deadline.
   - Include required language that the post was created for this hackathon.
   - Use `#H0Hackathon`.
   - This is worth up to +0.6 points and is mathematically high ROI.

### Lower ROI / Riskier This Late

- Multi-region DSQL active-active demo.
- DynamoDB Streams + Lambda + WebSocket fanout.
- Seller dashboard.
- Payments.
- Full Clerk auth wiring.

These are good follow-ups, but they should not destabilize the current
working, judge-ready DSQL proof unless they are already almost complete.

---

## Demo Video Script

Target structure:

1. `0:00-0:20` — Problem
   - Live auctions are deceptively hard: global bidders, last-second bids,
     concurrent writes, and exactly one winner.

2. `0:20-0:55` — Product
   - Show landing page.
   - Show luxury lots.
   - Open a lot detail page.

3. `0:55-1:30` — Live bidding
   - Two tabs with two bidders.
   - Place a bid.
   - Show outbid feedback.
   - Show anti-snipe clock extension if possible.

4. `1:30-2:20` — Database proof
   - Run the concurrency proof.
   - Show throughput, OCC retries, p50/p99 latency.
   - End on all invariants green.

5. `2:20-2:45` — Architecture
   - Vercel Next.js App Router.
   - Route handlers on Node runtime.
   - Aurora DSQL source of truth.
   - Serializable transaction + OCC retry.

6. `2:45-3:00` — Why this wins
   - DSQL is not a checkbox; it is what makes global live bidding correct.

---

## Verification

Before recording or redeploying:

1. `npm run build`.
2. `npm run seed`.
3. Open `/` and verify the featured lots use the new local images.
4. Open `/auctions` and verify all six lot names/prices look credible.
5. Open the Patek detail page and run the stress panel.
6. Verify two-tab bidding and outbid toast still work.
7. Verify the anti-snipe lot extends the clock on a late bid.

---

## Assumptions

- The provided images are authorized for hackathon/demo use or have usable
  licenses.
- Seed prices are plausible demo estimates, not appraisals.
- Exact branded names are acceptable as descriptive resale listings, but the app
  should avoid unsupported claims like "museum provenance" or "first edition"
  unless verified.
