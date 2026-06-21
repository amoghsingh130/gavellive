import { runStress, MAX_BIDS, MAX_CONCURRENCY } from "@/lib/stress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Bursts of concurrent DSQL transactions need headroom under the function limit.
export const maxDuration = 60;

// POST /api/auctions/:id/stress  { bids?, concurrency? }
// Fires N genuine concurrent place-bid transactions against Aurora DSQL, then
// verifies correctness invariants — the in-app concurrency proof.
//
// Responds as a stream of newline-delimited JSON: zero or more
// { type: "progress", ... } telemetry snapshots while the burst runs, then a
// terminal { type: "result", ... } (or { type: "error", error }).
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: { bids?: number; concurrency?: number } = {};
  try {
    body = await req.json();
  } catch {
    // Empty/invalid body is fine — fall back to defaults.
  }

  const bids = clampInt(body.bids, MAX_BIDS);
  const concurrency = clampInt(body.concurrency, MAX_CONCURRENCY);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await runStress(
          { auctionId: id, bids, concurrency },
          (p) => send({ type: "progress", ...p }),
        );
        send({ type: "result", ...result });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
    },
  });
}

function clampInt(v: unknown, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.max(1, Math.min(Math.floor(v), max));
}
