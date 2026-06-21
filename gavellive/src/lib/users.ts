import { withDb } from "./db";

/**
 * Bidder identity reads for the lightweight picker (no Clerk login wall yet —
 * Clerk stays a scoped follow-up). The bids route already accepts a bidderId in
 * the body, so the UI just needs a roster to pick from.
 */

export interface PublicUser {
  id: string;
  display_name: string | null;
  email: string;
}

export async function listUsers(limit = 50): Promise<PublicUser[]> {
  return withDb(async (c) => {
    const { rows } = await c.query<PublicUser>(
      `SELECT id, display_name, email
         FROM users
        ORDER BY created_at ASC
        LIMIT $1`,
      [limit],
    );
    return rows;
  });
}
