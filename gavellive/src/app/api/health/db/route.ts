import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";

// pg needs the Node.js runtime (not Edge), and this must never be statically
// cached — it proves a live DSQL connection at request time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withDb((client) =>
      client.query("SELECT 1 AS ok, now() AS server_time"),
    );
    return NextResponse.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
