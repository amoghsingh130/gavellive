import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuction } from "@/lib/auctions";
import AuctionDetailClient from "@/components/AuctionDetailClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // A malformed id throws on the UUID cast in Postgres — treat any load
  // failure (bad id or genuinely missing) as a 404 rather than a 500.
  let detail: Awaited<ReturnType<typeof getAuction>> = null;
  try {
    detail = await getAuction(id);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-1.5 text-sm text-text-faint transition-colors hover:text-text"
        >
          <span aria-hidden>←</span> Back to the floor
        </Link>
      </div>
      <AuctionDetailClient initial={detail} />
    </>
  );
}
