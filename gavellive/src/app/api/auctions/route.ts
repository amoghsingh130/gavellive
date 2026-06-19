import { NextResponse } from "next/server";
import { listAuctions } from "@/lib/auctions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auctions — all auctions, soonest-ending first.
export async function GET() {
  try {
    const auctions = await listAuctions();
    return NextResponse.json({ auctions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
