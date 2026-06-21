"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuctionDetail } from "@/lib/auctions";
import type { PublicUser } from "@/lib/users";
import { formatMoney, formatRelative, initials } from "@/lib/format";
import {
  displayItemDescription,
  displayItemTitle,
  getItemMedia,
} from "@/lib/catalog";
import { useBidder } from "./useBidder";
import { useToast } from "./Toast";
import ImageGallery from "./ImageGallery";
import SpinViewer from "./SpinViewer";
import CountdownTimer from "./CountdownTimer";
import StatusPill, { type PillState } from "./StatusPill";
import StressPanel from "./StressPanel";

const POLL_MS = 750;
const ENDING_SOON_MS = 120_000;

function minNextBid(d: AuctionDetail): number {
  const a = d.auction;
  return a.current_high_bid == null
    ? Number(a.starting_price)
    : Number(a.current_high_bid) + Number(a.bid_increment);
}

export default function AuctionDetailClient({
  initial,
}: {
  initial: AuctionDetail;
}) {
  const { bidder } = useBidder();
  const { toast } = useToast();

  const [detail, setDetail] = useState<AuctionDetail>(initial);
  const [users, setUsers] = useState<Record<string, PublicUser>>({});
  const [amount, setAmount] = useState<string>(() =>
    minNextBid(initial).toFixed(2),
  );
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const inFlight = useRef(false);
  const prevHighBidder = useRef<string | null>(
    initial.auction.current_high_bidder_id,
  );
  const userDirtyRef = useRef(false);

  const ended = detail.auction.status !== "live";
  const min = minNextBid(detail);

  const media = getItemMedia(initial.auction.title);
  const [view, setView] = useState<"spin" | "photos">(
    media?.spin ? "spin" : "photos",
  );

  // Load the roster once to resolve bidder ids -> names.
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: { users?: PublicUser[] }) => {
        const map: Record<string, PublicUser> = {};
        for (const u of data.users ?? []) map[u.id] = u;
        setUsers(map);
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/auctions/${initial.auction.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const next = (await res.json()) as AuctionDetail;

      // Outbid detection: I held the top spot and just lost it.
      const newHigh = next.auction.current_high_bidder_id;
      if (
        bidder &&
        prevHighBidder.current === bidder.id &&
        newHigh != null &&
        newHigh !== bidder.id
      ) {
        const byName =
          users[newHigh]?.display_name ?? users[newHigh]?.email ?? "another bidder";
        toast({
          kind: "error",
          title: "You've been outbid",
          body: `${byName} bid ${formatMoney(next.auction.current_high_bid)}`,
        });
      }
      prevHighBidder.current = newHigh;

      setDetail(next);
    } finally {
      inFlight.current = false;
    }
  }, [initial.auction.id, bidder, toast, users]);

  // Poll for live updates.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Keep the bid input synced to the min next bid until the user edits it.
  useEffect(() => {
    if (!touched && !userDirtyRef.current) {
      setAmount(min.toFixed(2));
    }
  }, [min, touched]);

  const name = (id: string | null) =>
    id == null
      ? "—"
      : users[id]?.display_name ?? users[id]?.email ?? "Bidder";

  const isMine = (id: string | null) => bidder != null && id === bidder.id;

  async function placeBid() {
    if (submitting) return;
    if (!bidder) {
      toast({ kind: "error", title: "Pick a bidder first", body: "Use the picker in the header." });
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value)) {
      toast({ kind: "error", title: "Enter a valid amount" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${initial.auction.id}/bids`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bidderId: bidder.id, amount: value }),
      });
      const data = await res.json();
      if (data.status === "accepted") {
        toast({
          kind: "success",
          title: "You're the high bidder!",
          body: `${formatMoney(data.newHighBid)}${data.extended ? " · clock extended (anti-snipe)" : ""}`,
        });
        setTouched(false);
        userDirtyRef.current = false;
      } else {
        toast({
          kind: "error",
          title: "Bid rejected",
          body: prettyReason(data.reason),
        });
      }
      await refresh();
    } catch (err) {
      toast({
        kind: "error",
        title: "Bid failed",
        body: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function closeNow() {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/auctions/${initial.auction.id}/close`, {
        method: "POST",
      });
      const next = (await res.json()) as AuctionDetail;
      setDetail(next);
      toast({
        kind: "info",
        title: "Auction closed",
        body: next.sold
          ? `Winner: ${name(next.winnerId)}`
          : "No winner (reserve not met)",
      });
    } finally {
      setClosing(false);
    }
  }

  const a = detail.auction;
  const endsAtMs = new Date(a.ends_at).getTime();
  const pill: PillState = ended
    ? detail.sold
      ? "sold"
      : "ended"
    : endsAtMs - Date.now() < ENDING_SOON_MS
      ? "ending-soon"
      : "live";

  const gallery = media?.gallery ?? (a.image_url ? [a.image_url] : []);
  const displayTitle = displayItemTitle(a.title);
  const displayDescription = displayItemDescription(a.title, a.description);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: artwork + description + history */}
        <div className="space-y-6">
          <div className="relative">
            {/* View toggle (only when a 360° hero is available) */}
            {media?.spin && (
              <div className="absolute left-4 top-4 z-10 flex rounded-full border border-border bg-surface/90 p-0.5 shadow-card backdrop-blur">
                {(["spin", "photos"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      view === v
                        ? "bg-accent text-white"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {v === "spin" ? "360°" : "Photos"}
                  </button>
                ))}
              </div>
            )}
            <div className="absolute right-4 top-4 z-10">
              <StatusPill state={pill} />
            </div>

            {media?.spin && view === "spin" ? (
              <SpinViewer
                image={gallery[0] ?? null}
                alt={displayTitle}
                className="aspect-[16/10] w-full"
              />
            ) : (
              <ImageGallery
                images={gallery}
                alt={displayTitle}
                fallbackId={a.id}
                className="aspect-[16/10] w-full"
              />
            )}
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              {displayTitle}
            </h1>
            {displayDescription && (
              <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
                {displayDescription}
              </p>
            )}
          </div>

          {/* Bid history */}
          <div className="rounded-3xl border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5">
              <h2 className="text-sm font-bold text-text">Bid history</h2>
              <span className="nums text-xs font-semibold text-text-faint">
                {detail.bids.length} {detail.bids.length === 1 ? "bid" : "bids"}
              </span>
            </div>
            {detail.bids.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-faint">
                No bids yet — be the first.
              </p>
            ) : (
              <ul className="scroll-thin max-h-80 divide-y divide-border-soft overflow-y-auto">
                {detail.bids.map((b, i) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-text-muted">
                      {initials(name(b.bidder_id))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {name(b.bidder_id)}
                        {isMine(b.bidder_id) && (
                          <span className="ml-1.5 text-[10px] font-bold text-accent">you</span>
                        )}
                      </p>
                      <p className="text-[11px] text-text-faint">
                        {formatRelative(b.created_at)}
                      </p>
                    </div>
                    <span
                      className={`nums text-sm font-bold ${i === 0 ? "text-emerald" : "text-text-muted"}`}
                    >
                      {formatMoney(b.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: live state + bid panel + stress */}
        <div className="space-y-6">
          {/* Winner banner */}
          {ended && (
            <div
              className={`animate-pop rounded-3xl border px-5 py-4 shadow-card ${
                detail.sold
                  ? "border-accent/40 bg-accent-soft"
                  : "border-border bg-surface-2"
              }`}
            >
              {detail.sold ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    Sold
                  </p>
                  <p className="mt-1 text-lg font-bold text-text">
                    {name(detail.winnerId)}
                    {isMine(detail.winnerId) && (
                      <span className="ml-1.5 text-sm font-semibold text-accent">— that's you!</span>
                    )}
                  </p>
                  <p className="nums mt-0.5 text-sm text-text-muted">
                    won for {formatMoney(a.current_high_bid)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-faint">
                    Auction ended
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {a.current_high_bidder_id
                      ? "Reserve price not met — no sale."
                      : "No bids were placed."}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Live price card */}
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  {a.current_high_bid != null ? "Current bid" : "Starting price"}
                </p>
                <p className="nums mt-1 text-4xl font-extrabold text-text">
                  {formatMoney(a.current_high_bid ?? a.starting_price)}
                </p>
                {a.current_high_bidder_id && (
                  <p className="mt-1 text-xs text-text-muted">
                    by{" "}
                    <span className={isMine(a.current_high_bidder_id) ? "font-semibold text-emerald" : "font-semibold text-text"}>
                      {name(a.current_high_bidder_id)}
                      {isMine(a.current_high_bidder_id) && " (you)"}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                  {ended ? "Closed" : "Ends in"}
                </p>
                <CountdownTimer
                  endsAt={a.ends_at}
                  ended={ended}
                  onExpire={refresh}
                  className="mt-1 text-xl font-bold"
                />
              </div>
            </div>

            {/* Bid panel */}
            {!ended && (
              <div className="mt-5 border-t border-border-soft pt-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-muted">
                    Your bid
                  </label>
                  <span className="nums text-xs text-text-faint">
                    min {formatMoney(min)}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <span className="nums pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setTouched(true);
                        userDirtyRef.current = true;
                      }}
                      className="nums w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 pl-7 font-semibold text-text outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <button
                    onClick={placeBid}
                    disabled={submitting}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Placing…" : "Place bid"}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  {[0, 1, 5].map((mult) => {
                    const v = min + mult * Number(a.bid_increment);
                    return (
                      <button
                        key={mult}
                        onClick={() => {
                          setAmount(v.toFixed(2));
                          setTouched(true);
                          userDirtyRef.current = true;
                        }}
                        className="nums flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
                      >
                        {formatMoney(v)}
                      </button>
                    );
                  })}
                </div>
                {!bidder && (
                  <p className="mt-2 text-xs font-medium text-rose">
                    Pick a bidder in the header to bid.
                  </p>
                )}
              </div>
            )}

            {/* Demo close control */}
            {!ended && (
              <button
                onClick={closeNow}
                disabled={closing}
                className="mt-4 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-xs font-medium text-text-faint transition-colors hover:border-rose/40 hover:text-rose disabled:opacity-50"
              >
                {closing ? "Closing…" : "Close now (demo) — finalize winner"}
              </button>
            )}
          </div>

          {/* Showpiece */}
          <StressPanel
            auctionId={a.id}
            live={!ended}
            onComplete={refresh}
          />
        </div>
      </div>
    </main>
  );
}

function prettyReason(reason?: string): string {
  if (!reason) return "Try a higher amount.";
  if (reason.startsWith("bid_too_low")) {
    const m = reason.match(/min ([\d.]+)/);
    return m ? `Too low — minimum is ${formatMoney(m[1])}.` : "Bid too low.";
  }
  const map: Record<string, string> = {
    auction_not_found: "This auction no longer exists.",
    auction_not_live: "This auction isn't live.",
    auction_ended: "This auction has ended.",
    max_retries_exceeded_occ_conflict:
      "Too much contention — try again in a moment.",
  };
  return map[reason] ?? reason;
}
