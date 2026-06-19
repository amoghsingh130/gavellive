-- GavelLive — Aurora DSQL schema (source of truth)
--
-- IMPORTANT: Aurora DSQL is a PostgreSQL *subset*. This schema is written
-- defensively around its known limitations, but every statement must be
-- validated against your live cluster during the Phase 1 spike:
--   * NO FOREIGN KEY constraints in DSQL  -> referential integrity is enforced
--     in the application layer (the *_id columns below are logical refs only).
--   * Secondary indexes are created asynchronously via CREATE INDEX ASYNC,
--     outside of a transaction.
--   * gen_random_uuid() is expected to be available for UUID primary keys.
--   * Verify TIMESTAMPTZ DEFAULT now() is accepted; otherwise set timestamps
--     from the app layer.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT NOT NULL,            -- maps to the Clerk user id
  email         TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auctions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id               UUID NOT NULL,           -- -> users.id (app-enforced)
  title                   TEXT NOT NULL,
  description             TEXT,
  image_url               TEXT,
  starting_price          NUMERIC(12,2) NOT NULL,
  bid_increment           NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  reserve_price           NUMERIC(12,2),
  current_high_bid        NUMERIC(12,2),
  current_high_bidder_id  UUID,                    -- -> users.id (app-enforced)
  status                  TEXT NOT NULL DEFAULT 'live',  -- live | closed | ended
  anti_snipe_window_secs  INTEGER NOT NULL DEFAULT 30,
  anti_snipe_extend_secs  INTEGER NOT NULL DEFAULT 30,
  starts_at               TIMESTAMPTZ,
  ends_at                 TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL,               -- -> auctions.id (app-enforced)
  bidder_id   UUID NOT NULL,               -- -> users.id (app-enforced)
  amount      NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (run individually; DSQL creates them asynchronously).
-- If CREATE INDEX ASYNC or IF NOT EXISTS is rejected, fall back to plain
-- CREATE INDEX and run each on its own.
CREATE INDEX ASYNC IF NOT EXISTS idx_users_clerk_id
  ON users (clerk_id);
CREATE INDEX ASYNC IF NOT EXISTS idx_auctions_status_ends_at
  ON auctions (status, ends_at);
CREATE INDEX ASYNC IF NOT EXISTS idx_bids_auction_created
  ON bids (auction_id, created_at);
