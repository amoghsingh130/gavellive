"use client";

import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { setBidder, useBidder, type Bidder } from "./useBidder";
import type { PublicUser } from "@/lib/users";

/**
 * "Bidding as <name>" picker that lives in the header. Loads the seeded roster
 * lazily on first open and persists the choice via the shared useBidder store.
 */
export default function BidderPicker() {
  const { bidder, ready } = useBidder();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Auto-pick the first bidder once the roster loads if nothing is chosen yet.
  useEffect(() => {
    if (ready && !bidder && users && users.length > 0) {
      const u = users[0];
      setBidder({ id: u.id, name: u.display_name ?? u.email });
    }
  }, [ready, bidder, users]);

  async function loadUsers() {
    if (users || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  // Load the roster eagerly so the auto-pick can happen without a click.
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(u: PublicUser) {
    const b: Bidder = { id: u.id, name: u.display_name ?? u.email };
    setBidder(b);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm transition-colors hover:border-accent/50"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
          {initials(bidder?.name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-text sm:inline">
          {bidder ? bidder.name : "Pick a bidder"}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="animate-pop absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/50">
          <p className="border-b border-border-soft px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Bidding as
          </p>
          <div className="scroll-thin max-h-72 overflow-y-auto py-1">
            {loading && (
              <p className="px-3 py-3 text-sm text-text-muted">Loading roster…</p>
            )}
            {users && users.length === 0 && (
              <p className="px-3 py-3 text-sm text-text-muted">
                No bidders seeded yet.
              </p>
            )}
            {users?.map((u) => {
              const active = u.id === bidder?.id;
              return (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                    active ? "bg-surface-2" : ""
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                    {initials(u.display_name ?? u.email)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text">
                    {u.display_name ?? u.email}
                  </span>
                  {active && <span className="text-emerald">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
