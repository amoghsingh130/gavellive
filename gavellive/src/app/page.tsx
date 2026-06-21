import Link from "next/link";
import { listAuctions } from "@/lib/auctions";
import { formatMoney } from "@/lib/format";
import { displayItemTitle, getItemMedia } from "@/lib/catalog";
import AuctionCard from "@/components/AuctionCard";
import FeaturedShowcase, { type FeaturedLot } from "@/components/FeaturedShowcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Landing() {
  let auctions = [] as Awaited<ReturnType<typeof listAuctions>>;
  try {
    auctions = await listAuctions();
  } catch {
    auctions = [];
  }

  const liveLots = auctions.filter((a) => a.status === "live");
  // Featured = spin hero first, then other live lots.
  const ordered = [...liveLots].sort((a, b) => {
    const sa = getItemMedia(a.title)?.spin ? 0 : 1;
    const sb = getItemMedia(b.title)?.spin ? 0 : 1;
    return sa - sb;
  });
  const featured: FeaturedLot[] = ordered.slice(0, 5).map((a) => ({
    id: a.id,
    title: displayItemTitle(a.title),
    caption: a.current_high_bid != null ? "Current bid" : "Starting at",
    priceLabel: formatMoney(a.current_high_bid ?? a.starting_price),
    image: getItemMedia(a.title)?.gallery[0] ?? a.image_url,
  }));

  return (
    <main className="flex-1">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight text-text sm:text-6xl">
            The live
            <br />
            auction floor.
            <br />
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              Provably fair.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-text-muted">
            Bid in real time on rare lots. Every bid is a serializable
            transaction on a strongly-consistent database — so the price is
            always right, and there&apos;s always exactly one winner. Even under
            hundreds of bids at once.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/auctions"
              className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-opacity hover:opacity-90"
            >
              Enter the floor →
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-text shadow-card transition-colors hover:border-accent/40"
            >
              How it works
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-6 text-xs font-medium text-text-faint">
            <span>⚖︎ Strong consistency</span>
            <span>↻ Anti-snipe</span>
            <span>✓ Zero lost writes</span>
          </div>
        </div>

        <FeaturedShowcase lots={featured} />
      </section>

      {/* ---------------- Stats strip ---------------- */}
      <section className="border-y border-border-soft bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 sm:grid-cols-4 sm:px-6">
          {[
            { n: "300", l: "concurrent bids" },
            { n: "0", l: "lost writes" },
            { n: "1", l: "winner, always" },
            { n: "414", l: "OCC retries handled" },
          ].map((s) => (
            <div key={s.l} className="px-2 py-7 text-center">
              <p className="nums text-3xl font-extrabold text-text sm:text-4xl">
                {s.n}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          How it works
        </h2>
        <p className="mt-2 max-w-lg text-sm text-text-muted">
          A real auction is a correctness-under-concurrency problem. GavelLive
          makes the database the hero.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Pick a lot, place a bid",
              d: "Live price, high bidder, and a ticking clock — updating in real time as bids land.",
            },
            {
              n: "02",
              t: "Anti-snipe keeps it fair",
              d: "A last-second bid extends the clock, so the lot can't be stolen on the buzzer.",
            },
            {
              n: "03",
              t: "Settled on Aurora DSQL",
              d: "Every bid is a serializable transaction. Conflicts retry via OCC; the winner is the single source of truth.",
            },
          ].map((c) => (
            <div
              key={c.n}
              className="rounded-3xl border border-border bg-surface p-6 shadow-card"
            >
              <span className="nums text-sm font-extrabold text-accent">
                {c.n}
              </span>
              <h3 className="mt-3 text-lg font-bold text-text">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {c.d}
              </p>
            </div>
          ))}
        </div>

        {/* Correctness highlight */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-8 shadow-card sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                See it for yourself
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-text">
                Fire hundreds of bids at once.
                <br />
                Watch the invariants hold.
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Open a lot and run the in-app concurrency proof — genuine
                concurrent transactions against Aurora DSQL, with live throughput,
                OCC-conflict, and latency telemetry, then four invariant checks
                turning green.
              </p>
            </div>
            <Link
              href="/auctions"
              className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-opacity hover:opacity-90"
            >
              Run the proof →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Lot preview ---------------- */}
      {liveLots.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
              On the floor now
            </h2>
            <Link
              href="/auctions"
              className="text-sm font-bold text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {liveLots.slice(0, 3).map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
