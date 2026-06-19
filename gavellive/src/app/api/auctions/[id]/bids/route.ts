import { NextResponse } from "next/server";
import { placeBid } from "@/lib/bids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auctions/:id/bids  { bidderId, amount }
// NOTE: bidderId is taken from the body for now. Once Clerk is wired, derive
// the bidder identity from the authenticated session instead.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: auctionId } = await ctx.params;

  let body: { bidderId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { bidderId, amount } = body;
  if (!bidderId || typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "bidderId and numeric amount are required" },
      { status: 400 },
    );
  }

  try {
    const result = await placeBid({ auctionId, bidderId, amount });
    const httpStatus = result.status === "accepted" ? 200 : 409;
    return NextResponse.json(result, { status: httpStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
