import Link from "next/link";
import { listAuctions } from "@/lib/auctions";
import AuctionCard from "@/components/AuctionCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FloorPage() {
  let auctions = [] as Awaited<ReturnType<typeof listAuctions>>;
  let error: string | null = null;
  try {
    auctions = await listAuctions();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            The floor
          </h1>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Browse rare lots, follow the current price, and place your bid.
          </p>
        </div>
        <span className="nums rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-faint shadow-card">
          {auctions.length} {auctions.length === 1 ? "lot" : "lots"}
        </span>
      </div>

      <section className="mt-8">
        {error ? (
          <div className="rounded-3xl border border-rose/30 bg-rose-soft/40 p-6 text-sm font-medium text-rose">
            Couldn’t load auctions: {error}
          </div>
        ) : auctions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center shadow-card">
            <p className="font-medium text-text-muted">No auctions yet.</p>
            <p className="mt-1 text-sm text-text-faint">
              Run{" "}
              <code className="nums rounded bg-surface-2 px-1.5 py-0.5">
                npm run seed
              </code>{" "}
              to populate the floor.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
