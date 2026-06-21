"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuctionImage from "./AuctionImage";

export interface FeaturedLot {
  id: string;
  title: string;
  priceLabel: string;
  caption: string; // "Current bid" | "Starting at"
  image: string | null;
}

/**
 * Auto-rotating featured showcase for the landing hero. The active lot's real
 * photo fills the hero frame while the showcase cycles through featured lots,
 * pausing on hover, with a thumbnail selector.
 */
export default function FeaturedShowcase({ lots }: { lots: FeaturedLot[] }) {
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (lots.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setActive((i) => (i + 1) % lots.length);
    }, 5000);
    return () => clearInterval(id);
  }, [lots.length]);

  if (lots.length === 0) return null;
  const lot = lots[active];

  return (
    <div
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="aspect-square w-full overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-card sm:aspect-[4/3]">
        <AuctionImage
          key={lot.id}
          src={lot.image}
          alt={lot.title}
          id={lot.id}
          className="h-full w-full"
        />
      </div>

      {/* caption card */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-card backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text">{lot.title}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            {lot.caption}{" "}
            <span className="nums text-emerald">{lot.priceLabel}</span>
          </p>
        </div>
        <Link
          href={`/auctions/${lot.id}`}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          View lot →
        </Link>
      </div>

      {/* selector */}
      {lots.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {lots.map((l, i) => (
            <button
              key={l.id}
              aria-label={`Show ${l.title}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-accent" : "w-2 bg-border hover:bg-text-faint"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
