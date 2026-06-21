"use client";

import Link from "next/link";
import { useState } from "react";
import type { Auction } from "@/lib/types";
import { displayItemTitle, getItemMedia } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import AuctionImage from "./AuctionImage";
import CountdownTimer from "./CountdownTimer";
import StatusPill, { type PillState } from "./StatusPill";

const ENDING_SOON_MS = 120_000;

function reserveMet(a: Auction): boolean {
  return (
    a.reserve_price == null ||
    (a.current_high_bid != null &&
      Number(a.current_high_bid) >= Number(a.reserve_price))
  );
}

export default function AuctionCard({ auction }: { auction: Auction }) {
  const endsAtMs = new Date(auction.ends_at).getTime();
  const initiallyOver = auction.status !== "live" || endsAtMs <= Date.now();
  const [over, setOver] = useState(initiallyOver);

  const pill: PillState = over
    ? auction.current_high_bidder_id && reserveMet(auction)
      ? "sold"
      : "ended"
    : endsAtMs - Date.now() < ENDING_SOON_MS
      ? "ending-soon"
      : "live";

  const price = formatMoney(auction.current_high_bid ?? auction.starting_price);
  const hasBids = auction.current_high_bid != null;
  const image = getItemMedia(auction.title)?.gallery[0] ?? auction.image_url;
  const title = displayItemTitle(auction.title);

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-card-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <AuctionImage
          src={image}
          alt={title}
          id={auction.id}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3">
          <StatusPill state={pill} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-text">
          {title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              {hasBids ? "Current bid" : "Starting at"}
            </p>
            <p className="nums truncate text-xl font-bold text-text">
              {price}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-text-faint">
              {over ? "Closed" : "Ends in"}
            </p>
            <CountdownTimer
              endsAt={auction.ends_at}
              ended={initiallyOver}
              onExpire={() => setOver(true)}
              className="text-sm font-semibold"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
