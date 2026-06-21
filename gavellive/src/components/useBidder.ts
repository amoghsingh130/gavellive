"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight bidder identity, synced across components within a single tab
 * (the header picker, the bid panel, and the stress panel all read it).
 *
 * Stored in *sessionStorage*, not localStorage, on purpose: sessionStorage is
 * scoped to a single tab, so two tabs can hold two different bidders. That's
 * what makes the multi-bidder demo work — open the auction in two tabs, pick a
 * different bidder in each, and bid back and forth to see live outbid toasts.
 * (localStorage would be shared across tabs and clobber the other tab's choice.)
 *
 * No Clerk login wall yet — Clerk stays a scoped follow-up.
 */

export interface Bidder {
  id: string;
  name: string;
}

const KEY = "gavellive:bidder";
const EVENT = "gavellive:bidder-change";

function read(): Bidder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Bidder) : null;
  } catch {
    return null;
  }
}

export function setBidder(b: Bidder | null) {
  if (typeof window === "undefined") return;
  if (b) sessionStorage.setItem(KEY, JSON.stringify(b));
  else sessionStorage.removeItem(KEY);
  // Same-tab sync only — sessionStorage doesn't cross tabs by design.
  window.dispatchEvent(new Event(EVENT));
}

export function useBidder(): { bidder: Bidder | null; ready: boolean } {
  const [bidder, setState] = useState<Bidder | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return { bidder, ready };
}
