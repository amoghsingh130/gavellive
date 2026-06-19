import { withDb } from "./db";
import type { Auction, Bid } from "./types";

/**
 * Auction reads + winner finalization.
 *
 * Finalization is "lazy close-on-read": an auction flips live -> ended the
 * first time it's read after its clock runs out. The close is a single
 * conditional UPDATE guarded by `ends_at <= now()`, so it's atomic and safe
 * under concurrency — if a last-second bid just extended `ends_at` via
 * anti-snipe, the guard fails and the auction stays live. The winner is simply
 * whoever holds current_high_bidder_id at close (subject to reserve).
 */

export interface AuctionDetail {
  auction: Auction;
  bids: Bid[];
  sold: boolean;
  winnerId: string | null;
}

function reserveMet(a: Auction): boolean {
  return (
    a.reserve_price == null ||
    (a.current_high_bid != null &&
      Number(a.current_high_bid) >= Number(a.reserve_price))
  );
}

export async function listAuctions(): Promise<Auction[]> {
  return withDb(async (c) => {
    await c.query(
      `UPDATE auctions SET status = 'ended'
        WHERE status = 'live' AND ends_at <= now()`,
    );
    const { rows } = await c.query<Auction>(
      `SELECT * FROM auctions ORDER BY ends_at ASC`,
    );
    return rows;
  });
}

export async function getAuction(id: string): Promise<AuctionDetail | null> {
  return withDb(async (c) => {
    // Lazy close-on-read — only fires if the clock has genuinely run out.
    await c.query(
      `UPDATE auctions SET status = 'ended'
        WHERE id = $1 AND status = 'live' AND ends_at <= now()`,
      [id],
    );
    const { rows } = await c.query<Auction>(
      `SELECT * FROM auctions WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return null;
    const auction = rows[0];
    const { rows: bids } = await c.query<Bid>(
      `SELECT * FROM bids WHERE auction_id = $1
        ORDER BY amount DESC, created_at DESC LIMIT 50`,
      [id],
    );
    const sold =
      auction.status === "ended" &&
      auction.current_high_bidder_id != null &&
      reserveMet(auction);
    return {
      auction,
      bids,
      sold,
      winnerId: sold ? auction.current_high_bidder_id : null,
    };
  });
}

/** Force an auction closed immediately (e.g. to finalize a winner on demand). */
export async function closeAuction(id: string): Promise<AuctionDetail | null> {
  await withDb((c) =>
    c.query(
      `UPDATE auctions SET status = 'ended', ends_at = now()
        WHERE id = $1 AND status = 'live'`,
      [id],
    ),
  );
  return getAuction(id);
}
