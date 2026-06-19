// Domain types mirroring the DSQL schema (db/schema.sql).

export type AuctionStatus = "live" | "closed" | "ended";

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Auction {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starting_price: string; // NUMERIC comes back as string from pg
  bid_increment: string;
  reserve_price: string | null;
  current_high_bid: string | null;
  current_high_bidder_id: string | null;
  status: AuctionStatus;
  anti_snipe_window_secs: number;
  anti_snipe_extend_secs: number;
  starts_at: string | null;
  ends_at: string;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: string;
  created_at: string;
}
