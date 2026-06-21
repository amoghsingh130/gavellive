import { withDb } from "./db";
import { placeBid } from "./bids";

/**
 * In-app concurrency proof — the showpiece.
 *
 * This mirrors the invariant logic of scripts/load-test.mjs, but instead of
 * firing HTTP requests it calls placeBid() directly. That means the burst is N
 * *genuine* concurrent DSQL transactions racing through the same serializable
 * place-bid path, exercising Aurora DSQL's optimistic concurrency control (OCC)
 * and our retry loop — the real thing, not a simulation.
 *
 * Correctness is verified with before/after deltas against DSQL (the source of
 * truth), so it stays honest even when the auction already carries manual demo
 * bids placed during the live walkthrough.
 */

export interface StressCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface StressResult {
  requested: number;
  concurrency: number;
  accepted: number;
  rejected: number;
  errored: number;
  occRetries: number; // extra attempts beyond the first, summed across bids
  maxAttempts: number; // worst-case attempts on a single bid
  elapsedMs: number;
  beforeCount: number;
  afterCount: number;
  finalHighBid: number | null;
  checks: StressCheck[];
  allPass: boolean;
}

/** A live snapshot emitted while the burst is in flight (DSQL telemetry). */
export interface StressProgress {
  elapsedMs: number;
  completed: number;
  total: number;
  accepted: number;
  rejected: number;
  errored: number;
  occRetries: number;
  throughput: number; // committed+rejected tx per second (rolling)
  p50: number; // place-bid latency, ms (incl. OCC retries)
  p99: number;
  inFlight: number; // workers currently mid-transaction
}

// Safety caps: respect DSQL connection limits + the Vercel function timeout.
export const MAX_BIDS = 500;
export const MAX_CONCURRENCY = 50;

const PROGRESS_MS = 120; // telemetry tick cadence

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((q / 100) * sorted.length) - 1),
  );
  return Math.round(sorted[idx]);
}

export async function runStress(
  params: {
    auctionId: string;
    bids?: number;
    concurrency?: number;
  },
  onProgress?: (p: StressProgress) => void,
): Promise<StressResult> {
  const requested = Math.max(2, Math.min(params.bids ?? 200, MAX_BIDS));
  const concurrency = Math.max(
    1,
    Math.min(params.concurrency ?? 30, MAX_CONCURRENCY),
  );

  // 1. Read the target auction + bidder roster, snapshot the "before" state.
  const setup = await withDb(async (c) => {
    const { rows: aRows } = await c.query(
      `SELECT starting_price, bid_increment, current_high_bid, status, ends_at
         FROM auctions WHERE id = $1`,
      [params.auctionId],
    );
    if (aRows.length === 0) return null;
    const { rows: uRows } = await c.query<{ id: string }>(
      `SELECT id FROM users ORDER BY created_at ASC LIMIT 60`,
    );
    const { rows: cRows } = await c.query<{ n: number; max_amount: string | null }>(
      `SELECT COUNT(*)::int AS n, MAX(amount) AS max_amount
         FROM bids WHERE auction_id = $1`,
      [params.auctionId],
    );
    return {
      auction: aRows[0],
      userIds: uRows.map((u) => u.id),
      beforeCount: cRows[0].n,
      beforeMax: cRows[0].max_amount == null ? null : Number(cRows[0].max_amount),
    };
  });

  if (!setup) throw new Error("auction_not_found");
  if (setup.userIds.length === 0) throw new Error("no_bidders_seeded");
  if (setup.auction.status !== "live") throw new Error("auction_not_live");

  // 2. Build a plan of strictly-increasing distinct amounts. We start above any
  //    existing high bid so every planned amount is valid, and the top amount is
  //    unbeatable — it MUST end up as the final high bid if correctness holds.
  const increment = Number(setup.auction.bid_increment);
  const floor = Math.max(
    Number(setup.auction.starting_price),
    setup.beforeMax == null ? 0 : setup.beforeMax + increment,
  );
  const plan = Array.from({ length: requested }, (_, i) => ({
    bidderId: setup.userIds[i % setup.userIds.length],
    amount: Number((floor + i * increment).toFixed(2)),
  }));
  const expectedTop = plan[plan.length - 1].amount;
  const expectedTopBidder = plan[plan.length - 1].bidderId;

  // 3. Fire with bounded concurrency, tallying outcomes + OCC retry metrics,
  //    and stream live telemetry (throughput / conflicts / latency) as we go.
  let accepted = 0;
  let rejected = 0;
  let errored = 0;
  let totalAttempts = 0;
  let maxAttempts = 0;
  let inFlight = 0;
  const latencies: number[] = [];

  const started = Date.now();

  const emit = () => {
    if (!onProgress) return;
    const elapsed = Date.now() - started;
    const completed = accepted + rejected + errored;
    const sorted = [...latencies].sort((a, b) => a - b);
    onProgress({
      elapsedMs: elapsed,
      completed,
      total: requested,
      accepted,
      rejected,
      errored,
      occRetries: totalAttempts - (accepted + rejected),
      throughput: elapsed > 0 ? (completed / elapsed) * 1000 : 0,
      p50: percentile(sorted, 50),
      p99: percentile(sorted, 99),
      inFlight,
    });
  };
  const ticker = onProgress ? setInterval(emit, PROGRESS_MS) : null;

  let cursor = 0;
  async function worker() {
    while (cursor < plan.length) {
      const bid = plan[cursor++];
      inFlight++;
      const t0 = Date.now();
      try {
        const r = await placeBid({ auctionId: params.auctionId, ...bid });
        totalAttempts += r.attempts;
        maxAttempts = Math.max(maxAttempts, r.attempts);
        if (r.status === "accepted") accepted++;
        else rejected++;
      } catch {
        errored++;
      } finally {
        latencies.push(Date.now() - t0);
        inFlight--;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsedMs = Date.now() - started;
  if (ticker) clearInterval(ticker);
  emit(); // final in-flight snapshot before the verify step

  // 4. Verify invariants against DSQL using before/after deltas.
  const after = await withDb(async (c) => {
    const { rows: aRows } = await c.query(
      `SELECT current_high_bid, current_high_bidder_id FROM auctions WHERE id = $1`,
      [params.auctionId],
    );
    const { rows: cRows } = await c.query<{ n: number; max_amount: string | null }>(
      `SELECT COUNT(*)::int AS n, MAX(amount) AS max_amount
         FROM bids WHERE auction_id = $1`,
      [params.auctionId],
    );
    return {
      finalHigh:
        aRows[0].current_high_bid == null
          ? null
          : Number(aRows[0].current_high_bid),
      finalBidder: aRows[0].current_high_bidder_id as string | null,
      afterCount: cRows[0].n,
      afterMax: cRows[0].max_amount == null ? null : Number(cRows[0].max_amount),
    };
  });

  const writtenDelta = after.afterCount - setup.beforeCount;
  const checks: StressCheck[] = [
    {
      label: "No lost or duplicate writes",
      pass: writtenDelta === accepted,
      detail: `${writtenDelta} new rows == ${accepted} accepted`,
    },
    {
      label: "Final price equals the highest bid",
      pass: after.finalHigh != null && after.finalHigh === after.afterMax,
      detail: `high ${after.finalHigh} == max ${after.afterMax}`,
    },
    {
      label: "Final price equals the unbeatable top bid",
      pass: after.finalHigh === expectedTop,
      detail: `high ${after.finalHigh} == planned top ${expectedTop}`,
    },
    {
      label: "Exactly one winner — the top bidder",
      pass: after.finalBidder === expectedTopBidder,
      detail: `winner is the top bidder`,
    },
  ];

  return {
    requested,
    concurrency,
    accepted,
    rejected,
    errored,
    occRetries: totalAttempts - (accepted + rejected),
    maxAttempts,
    elapsedMs,
    beforeCount: setup.beforeCount,
    afterCount: after.afterCount,
    finalHighBid: after.finalHigh,
    checks,
    allPass: checks.every((c) => c.pass),
  };
}
