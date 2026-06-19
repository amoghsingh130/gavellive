// Applies db/schema.sql to the Aurora DSQL cluster, one statement at a time,
// reporting exactly which statements succeed and which DSQL rejects.
// This doubles as the Phase 1 capability spike.
//
// Run with:  npm run db:push
// (uses Node's native --env-file to load .env.local)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

const { Client } = pg;

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
console.log(`Connected to ${host}\n`);

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "..", "db", "schema.sql"), "utf8");

// Strip line comments, then split into individual statements on ';'.
// (schema.sql has no functions/dollar-quoted bodies, so a simple split is safe.)
const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

let ok = 0;
let fail = 0;
for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 72);
  try {
    await client.query(stmt);
    console.log(`✅ ${label}`);
    ok++;
  } catch (err) {
    console.log(`❌ ${label}`);
    console.log(`     ${err.message}`);
    fail++;
  }
}

await client.end();
console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
process.exit(fail > 0 ? 1 : 0);
