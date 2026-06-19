import { getClient } from "./db";

/**
 * Place-bid transaction — the correctness core.
 *
 * Aurora DSQL uses optimistic concurrency control: there are no row locks.
 * Concurrent bids read the same auction snapshot, and at COMMIT time DSQL
 * aborts whichever transaction would violate serializability (SQLSTATE 40001).
 * We catch that, re-read the now-updated auction, and retry with backoff.
 *
 * Invariants this guarantees under any amount of concurrency:
 *   - monotonic price (a bid only wins if it beats the current high + increment)
 *   - exactly one current_high_bidder
 *   - every accepted bid is persisted exactly once (no lost/duplicate writes)
 */

export type PlaceBidResult =
  | {
      status: "accepted";
      newHighBid: string;
      endsAt: string;
      extended: boolean;
      attempts: number;
    }
  | { status: "rejected"; reason: string; attempts: number };

const MAX_RETRIES = 10;

/** DSQL surfaces OCC/serialization aborts as 40001 (deadlock as 40P01). */
function isConcurrencyConflict(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === "40001" || code === "40P01") return true;
  const msg = (err as { message?: string } | null)?.message ?? "";
  return /serializ|concurren|conflict|OC0/i.test(msg);
}

function backoff(attempt: number): Promise<void> {
  // Exponential backoff with full jitter, capped at 500ms.
  const ceiling = Math.min(25 * 2 ** (attempt - 1), 500);
  return new Promise((r) => setTimeout(r, Math.random() * ceiling));
}

export async function placeBid(params: {
  auctionId: string;
  bidderId: string;
  amount: number;
}): Promise<PlaceBidResult> {
  const { auctionId, bidderId, amount } = params;
  const amountStr = amount.toFixed(2);

  const client = await getClient();
  try {
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        await client.query("BEGIN");

        const { rows } = await client.query(
          `SELECT starting_price, bid_increment, current_high_bid,
                  status, ends_at, anti_snipe_window_secs, anti_snipe_extend_secs
             FROM auctions WHERE id = $1`,
          [auctionId],
        );

        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return { status: "rejected", reason: "auction_not_found", attempts };
        }

        const a = rows[0];
        const now = Date.now();
        const endsAtMs = new Date(a.ends_at).getTime();

        if (a.status !== "live") {
          await client.query("ROLLBACK");
          return { status: "rejected", reason: "auction_not_live", attempts };
        }
        if (now >= endsAtMs) {
          await client.query("ROLLBACK");
          return { status: "rejected", reason: "auction_ended", attempts };
        }

        const minBid =
          a.current_high_bid == null
            ? Number(a.starting_price)
            : Number(a.current_high_bid) + Number(a.bid_increment);

        if (amount < minBid) {
          await client.query("ROLLBACK");
          return {
            status: "rejected",
            reason: `bid_too_low (min ${minBid.toFixed(2)})`,
            attempts,
          };
        }

        // Append the bid (bids is append-only).
        await client.query(
          `INSERT INTO bids (auction_id, bidder_id, amount) VALUES ($1, $2, $3)`,
          [auctionId, bidderId, amountStr],
        );

        // Anti-snipe: if the bid lands inside the window, push ends_at out.
        const windowMs = a.anti_snipe_window_secs * 1000;
        const extend = endsAtMs - now < windowMs;
        let newEndsAt: string;

        if (extend) {
          newEndsAt = new Date(
            now + a.anti_snipe_extend_secs * 1000,
          ).toISOString();
          await client.query(
            `UPDATE auctions
                SET current_high_bid = $1, current_high_bidder_id = $2, ends_at = $3
              WHERE id = $4`,
            [amountStr, bidderId, newEndsAt, auctionId],
          );
        } else {
          newEndsAt = new Date(endsAtMs).toISOString();
          await client.query(
            `UPDATE auctions
                SET current_high_bid = $1, current_high_bidder_id = $2
              WHERE id = $3`,
            [amountStr, bidderId, auctionId],
          );
        }

        await client.query("COMMIT");
        return {
          status: "accepted",
          newHighBid: amountStr,
          endsAt: newEndsAt,
          extended: extend,
          attempts,
        };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        if (isConcurrencyConflict(err) && attempts < MAX_RETRIES) {
          await backoff(attempts);
          continue;
        }
        throw err;
      }
    }

    return {
      status: "rejected",
      reason: "max_retries_exceeded_occ_conflict",
      attempts,
    };
  } finally {
    await client.end();
  }
}
