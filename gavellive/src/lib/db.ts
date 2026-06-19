import { Client } from "pg";
import { DsqlSigner } from "@aws-sdk/dsql-signer";

/**
 * Aurora DSQL connection helper.
 *
 * DSQL uses short-lived IAM auth tokens instead of static passwords, so we
 * generate a fresh token per connection. In serverless (Vercel) we keep
 * connections short-lived: open -> query -> close. Do NOT hold a long-lived
 * pool — tokens expire (~15 min) and Vercel functions are ephemeral.
 *
 * Required env vars (see .env.example):
 *   AWS_REGION       e.g. us-east-1
 *   DSQL_ENDPOINT    <cluster-id>.dsql.<region>.on.aws
 *   DSQL_USER        defaults to "admin"
 *   DSQL_DATABASE    defaults to "postgres"
 * Plus AWS credentials via the default provider chain
 * (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or an attached IAM role).
 */

const region = process.env.AWS_REGION ?? "us-east-1";
const host = process.env.DSQL_ENDPOINT;
const user = process.env.DSQL_USER ?? "admin";
const database = process.env.DSQL_DATABASE ?? "postgres";

async function generateAuthToken(): Promise<string> {
  if (!host) {
    throw new Error("DSQL_ENDPOINT is not set");
  }
  const signer = new DsqlSigner({ hostname: host, region });
  // The "admin" role uses the admin token; custom DB roles use the standard one.
  return user === "admin"
    ? signer.getDbConnectAdminAuthToken()
    : signer.getDbConnectAuthToken();
}

/** Open a fresh authenticated DSQL client. Caller is responsible for end(). */
export async function getClient(): Promise<Client> {
  if (!host) {
    throw new Error("DSQL_ENDPOINT is not set");
  }
  const token = await generateAuthToken();
  const client = new Client({
    host,
    port: 5432,
    user,
    database,
    password: token,
    // DSQL requires TLS; it presents a publicly-trusted certificate.
    ssl: { rejectUnauthorized: true },
  });
  await client.connect();
  return client;
}

/** Run work against a short-lived DSQL connection, always closing it after. */
export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
