import { NextResponse } from "next/server";
import { closeAuction } from "@/lib/auctions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auctions/:id/close — force-finalize an auction now (demo/admin).
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const detail = await closeAuction(id);
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
