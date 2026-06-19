// Concurrency load test — the demo punchline.
//
// Fires N concurrent bids at the REAL HTTP endpoint, with strictly increasing
// distinct amounts, then verifies correctness invariants directly against DSQL:
//   1. no lost/duplicate writes   (bids rows == accepted responses)
//   2. final price == the highest accepted bid == MAX(bids.amount)
//   3. exactly one current_high_bidder, and it is the top bidder
//
// Run with:  npm run loadtest   (optionally: -- --bids 500 --concurrency 80 --url http://localhost:3001)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

const { Client } = pg;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BIDS = Number(arg("bids", "300"));
const CONCURRENCY = Number(arg("concurrency", "50"));
const BASE_URL = arg("url", "http://localhost:3000");

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, "..", ".seed.json"), "utf8"));
const { auctionId, userIds, startingPrice, bidIncrement } = seed;

console.log(
  `Firing ${BIDS} bids at ${BASE_URL}/api/auctions/${auctionId}/bids ` +
    `(concurrency ${CONCURRENCY})\n`,
);

// Build the bid plan: strictly increasing distinct amounts. The maximum
// amount is unbeatable, so it MUST end up as the final high bid.
const plan = [];
for (let i = 0; i < BIDS; i++) {
  plan.push({
    bidderId: userIds[i % userIds.length],
    amount: Number((startingPrice + (i + 1) * bidIncrement).toFixed(2)),
  });
}
const expectedTopAmount = plan[plan.length - 1].amount;
const expectedTopBidder = plan[plan.length - 1].bidderId;

let accepted = 0;
let rejected = 0;
let errored = 0;
let totalAttempts = 0;
let maxAttempts = 0;

async function fireOne(bid) {
  try {
    const res = await fetch(`${BASE_URL}/api/auctions/${auctionId}/bids`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bid),
    });
    const data = await res.json();
    if (typeof data.attempts === "number") {
      totalAttempts += data.attempts;
      maxAttempts = Math.max(maxAttempts, data.attempts);
    }
    if (data.status === "accepted") accepted++;
    else rejected++;
  } catch {
    errored++;
  }
}

// Simple bounded-concurrency pool.
const started = Date.now();
let cursor = 0;
async function worker() {
  while (cursor < plan.length) {
    const idx = cursor++;
    await fireOne(plan[idx]);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const elapsed = ((Date.now() - started) / 1000).toFixed(2);

console.log(`Fired in ${elapsed}s`);
console.log(`  accepted:        ${accepted}`);
console.log(`  rejected:        ${rejected}`);
console.log(`  errored:         ${errored}`);
console.log(
  `  OCC retries:     total ${totalAttempts - (accepted + rejected)} ` +
    `extra attempts, max ${maxAttempts} attempts on a single bid\n`,
);

// --- Verify invariants against the source of truth (DSQL) ---
const region = process.env.AWS_REGION ?? "us-east-1";
const host = process.env.DSQL_ENDPOINT;
const signer = new DsqlSigner({ hostname: host, region });
const token = await signer.getDbConnectAdminAuthToken();
const client = new Client({
  host,
  port: 5432,
  user: process.env.DSQL_USER ?? "admin",
  database: process.env.DSQL_DATABASE ?? "postgres",
  password: token,
  ssl: { rejectUnauthorized: true },
});
await client.connect();

const { rows: aRows } = await client.query(
  `SELECT current_high_bid, current_high_bidder_id FROM auctions WHERE id = $1`,
  [auctionId],
);
const { rows: cRows } = await client.query(
  `SELECT COUNT(*)::int AS n, MAX(amount) AS max_amount FROM bids WHERE auction_id = $1`,
  [auctionId],
);
await client.end();

const finalHigh = Number(aRows[0].current_high_bid);
const finalBidder = aRows[0].current_high_bidder_id;
const bidRowCount = cRows[0].n;
const maxBidAmount = Number(cRows[0].max_amount);

function check(label, pass, detail) {
  console.log(`  ${pass ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

console.log("Invariants:");
let allPass = true;
allPass &= check(
  "no lost/duplicate writes (bid rows == accepted)",
  bidRowCount === accepted,
  `rows=${bidRowCount}, accepted=${accepted}`,
);
allPass &= check(
  "final price == highest accepted bid",
  finalHigh === maxBidAmount,
  `final=${finalHigh}, max=${maxBidAmount}`,
);
allPass &= check(
  "final price == unbeatable top bid",
  finalHigh === expectedTopAmount,
  `final=${finalHigh}, expected=${expectedTopAmount}`,
);
allPass &= check(
  "exactly one winner, and it is the top bidder",
  finalBidder === expectedTopBidder,
  `winner=${finalBidder}`,
);

console.log(
  `\n${allPass ? "✅ ALL INVARIANTS HOLD" : "❌ INVARIANT VIOLATION"} ` +
    `under ${accepted + rejected} concurrent bids.`,
);
process.exit(allPass ? 0 : 1);
