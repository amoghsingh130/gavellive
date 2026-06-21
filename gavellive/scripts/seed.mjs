// Resets the demo DB, seeds N users and a credible luxury auction floor, then
// writes .seed.json (pointing at the long-running stress auction) so the CLI
// load test still works.
//
// Floor includes: a long-running high-value "stress demo" lot, several live
// luxury lots, one short-clock anti-snipe lot, and one already-ended sold lot.
//
// Run with:  npm run seed   (optionally: npm run seed -- --users 100)

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

const { Client } = pg;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// A pool of plausible bidder names so the roster + history read like real people.
const NAMES = [
  "Ava Mercer", "Liam Okafor", "Noah Castellano", "Mia Tanaka", "Ethan Rao",
  "Sofia Lindqvist", "Lucas Moreau", "Isla Bennett", "Mateo Russo", "Zara Haddad",
  "Oliver Reyes", "Amara Diallo", "Henry Vance", "Priya Nair", "Theo Larsen",
  "Nina Petrova", "Caleb Fontaine", "Yuki Sato", "Diego Salazar", "Freya Holm",
];

const USERS = Number(arg("users", "60"));

const region = process.env.AWS_REGION ?? "us-east-1";
const host = process.env.DSQL_ENDPOINT;
const user = process.env.DSQL_USER ?? "admin";
const database = process.env.DSQL_DATABASE ?? "postgres";
if (!host) {
  console.error("DSQL_ENDPOINT is not set (check .env.local).");
  process.exit(1);
}

const signer = new DsqlSigner({ hostname: host, region });
const token =
  user === "admin"
    ? await signer.getDbConnectAdminAuthToken()
    : await signer.getDbConnectAuthToken();

const client = new Client({
  host,
  port: 5432,
  user,
  database,
  password: token,
  ssl: { rejectUnauthorized: true },
});
await client.connect();

// Keep the demo floor deterministic for video/judging. DSQL has no FKs here,
// but delete in dependency order so this also works in local Postgres.
await client.query("DELETE FROM bids");
await client.query("DELETE FROM auctions");
await client.query("DELETE FROM users");

// --- Users ---
const userIds = [];
const stamp = Date.now();
for (let i = 0; i < USERS; i++) {
  const { rows } = await client.query(
    `INSERT INTO users (clerk_id, email, display_name)
     VALUES ($1, $2, $3) RETURNING id`,
    [`seed_${stamp}_${i}`, `bidder${i}@example.com`, NAMES[i % NAMES.length] + ` ${i}`],
  );
  userIds.push(rows[0].id);
}

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

// Primary still per lot. Mirrors src/lib/catalog.ts so DB-stored image_url
// matches the on-page gallery.
const lot = (name) => `/lots/${name}`;

async function insertAuction(def) {
  const { rows } = await client.query(
    `INSERT INTO auctions
       (seller_id, title, description, image_url, starting_price, bid_increment,
        reserve_price, current_high_bid, current_high_bidder_id, status,
        anti_snipe_window_secs, anti_snipe_extend_secs, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      userIds[0],
      def.title,
      def.description,
      def.image_url ?? null,
      def.starting_price.toFixed(2),
      def.bid_increment.toFixed(2),
      def.reserve_price != null ? def.reserve_price.toFixed(2) : null,
      def.current_high_bid != null ? def.current_high_bid.toFixed(2) : null,
      def.current_high_bidder_id ?? null,
      def.status ?? "live",
      def.anti_snipe_window_secs ?? 30,
      def.anti_snipe_extend_secs ?? 30,
      iso(def.endsAtMs),
    ],
  );
  return rows[0].id;
}

// --- The stress-demo auction (long clock, the in-app showpiece target) ---
const stressStart = 48000;
const stressIncrement = 1000;
const stressId = await insertAuction({
  title:
    "1965 Patek Philippe Grand Complications Perpetual Chronograph Hand-Wind White Dial Men's Watch",
  description:
    "A gold Patek Philippe perpetual chronograph with a white dial and black leather strap. Estimate: $90,000-$140,000. This high-drama horology lot anchors the live concurrency proof.",
  image_url: lot("patek-gold-chronograph.jpg"),
  starting_price: stressStart,
  bid_increment: stressIncrement,
  reserve_price: 82000,
  endsAtMs: now + 6 * 3600 * 1000, // 6 hours
});

// --- Live premium lots ---
await insertAuction({
  title: "Vintage Tufted Leather Chesterfield Armchair in Red with Gold Rims",
  description:
    "An ornate red tufted armchair with carved gold-toned detailing and an intricate salon silhouette. Estimate: $2,500-$4,500.",
  image_url: lot("giltwood-velvet-chair.jpg"),
  starting_price: 1200,
  bid_increment: 100,
  reserve_price: 2400,
  anti_snipe_window_secs: 30,
  anti_snipe_extend_secs: 30,
  endsAtMs: now + 75 * 1000, // short clock for anti-snipe demo
});

await insertAuction({
  title: "Art Deco Diamond and Pearl Fan Brooch",
  description:
    "Fan-form setting with diamond accents and a pendant pearl drop, photographed against black fabric. Estimate: $14,000-$22,000.",
  image_url: lot("diamond-pearl-brooch.jpg"),
  starting_price: 6500,
  bid_increment: 250,
  reserve_price: 12000,
  endsAtMs: now + 12 * 60 * 1000,
});

await insertAuction({
  title: "Ricoh 500 G 35mm Rangefinder Camera",
  description:
    "1970s compact 35mm rangefinder with fixed lens and original body styling. Estimate: $180-$320.",
  image_url: lot("ricoh-500g-rangefinder.webp"),
  starting_price: 75,
  bid_increment: 10,
  reserve_price: 160,
  endsAtMs: now + 18 * 60 * 1000,
});

await insertAuction({
  title:
    "Foundation Isaac Asimov, First Edition Classic Vintage Science Fiction Paperback",
  description:
    "A collectible vintage paperback edition of Isaac Asimov's Foundation, selected for rare-book bidding. Estimate: $400-$900.",
  image_url: lot("asimov-foundation-paperback.jpg"),
  starting_price: 125,
  bid_increment: 25,
  reserve_price: 350,
  endsAtMs: now + 35 * 60 * 1000,
});

// --- An already-ended, SOLD lot (winner-state UI) ---
const soldStart = 28000;
const soldInc = 500;
const soldBids = [28000, 31500, 36000, 39500, 43000, 48500];
const soldWinner = userIds[3 % userIds.length];
const soldId = await insertAuction({
  title: "Vintage Burgundy 1967 Ford Mustang",
  description:
    "A well-kept vintage burgundy Ford Mustang with chrome trim and collector-driver presence. Estimate: $45,000-$65,000.",
  image_url: lot("ford-mustang-red.jpg"),
  starting_price: soldStart,
  bid_increment: soldInc,
  reserve_price: 42000,
  current_high_bid: soldBids[soldBids.length - 1],
  current_high_bidder_id: soldWinner,
  status: "ended",
  endsAtMs: now - 24 * 3600 * 1000, // ended yesterday
});

// Backfill a believable bid history for the sold lot.
for (let i = 0; i < soldBids.length; i++) {
  const bidder = i === soldBids.length - 1 ? soldWinner : userIds[(i + 1) % userIds.length];
  await client.query(
    `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
     VALUES ($1, $2, $3, $4)`,
    [
      soldId,
      bidder,
      soldBids[i].toFixed(2),
      iso(now - 24 * 3600 * 1000 - (soldBids.length - i) * 60 * 1000),
    ],
  );
}

await client.end();

// .seed.json drives the CLI load test — point it at the long-running lot.
const here = dirname(fileURLToPath(import.meta.url));
const out = {
  auctionId: stressId,
  userIds,
  startingPrice: stressStart,
  bidIncrement: stressIncrement,
  createdAt: new Date().toISOString(),
};
writeFileSync(join(here, "..", ".seed.json"), JSON.stringify(out, null, 2));

console.log(`Seeded ${USERS} users + 6 auctions.`);
console.log(`  stress-demo auctionId: ${stressId}`);
console.log(`  sold lot auctionId:    ${soldId}`);
console.log(`\nWrote .seed.json — now run: npm run dev  (or: npm run loadtest)`);
