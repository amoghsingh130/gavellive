// Seeds the DB with N users and one fresh live auction, then writes
// .seed.json (auctionId, userIds, pricing) for the load test to consume.
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

const USERS = Number(arg("users", "60"));
const STARTING_PRICE = Number(arg("start", "100"));
const BID_INCREMENT = Number(arg("increment", "5"));
const DURATION_SECS = Number(arg("duration", "3600")); // keep it open during the test

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

// Create users.
const userIds = [];
for (let i = 0; i < USERS; i++) {
  const { rows } = await client.query(
    `INSERT INTO users (clerk_id, email, display_name)
     VALUES ($1, $2, $3) RETURNING id`,
    [`seed_${Date.now()}_${i}`, `bidder${i}@example.com`, `Bidder ${i}`],
  );
  userIds.push(rows[0].id);
}

// Create one live auction owned by the first user.
const endsAt = new Date(Date.now() + DURATION_SECS * 1000).toISOString();
const { rows: aRows } = await client.query(
  `INSERT INTO auctions
     (seller_id, title, description, starting_price, bid_increment, status, ends_at)
   VALUES ($1, $2, $3, $4, $5, 'live', $6)
   RETURNING id`,
  [
    userIds[0],
    "Vintage Mechanical Keyboard",
    "Load-test auction for the concurrency demo.",
    STARTING_PRICE.toFixed(2),
    BID_INCREMENT.toFixed(2),
    endsAt,
  ],
);
const auctionId = aRows[0].id;

await client.end();

const here = dirname(fileURLToPath(import.meta.url));
const out = {
  auctionId,
  userIds,
  startingPrice: STARTING_PRICE,
  bidIncrement: BID_INCREMENT,
  createdAt: new Date().toISOString(),
};
writeFileSync(join(here, "..", ".seed.json"), JSON.stringify(out, null, 2));

console.log(`Seeded ${USERS} users + 1 auction.`);
console.log(`  auctionId:     ${auctionId}`);
console.log(`  startingPrice: ${STARTING_PRICE}`);
console.log(`  bidIncrement:  ${BID_INCREMENT}`);
console.log(`  ends_at:       ${endsAt}`);
console.log(`\nWrote .seed.json — now run: npm run loadtest`);
