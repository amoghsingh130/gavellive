import { NextResponse } from "next/server";
import { getAuction } from "@/lib/auctions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auctions/:id — auction detail + recent bids + winner state.
// Triggers lazy close-on-read finalization.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const detail = await getAuction(id);
    if (!detail) {
      return NextResponse.json({ error: "auction_not_found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
