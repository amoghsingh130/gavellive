"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";

/**
 * Live countdown to `endsAt`. Ticks ~1s, renders "ENDED" once the clock runs
 * out, and flashes when `endsAt` jumps forward — the visible signature of an
 * anti-snipe extension firing.
 */
export default function CountdownTimer({
  endsAt,
  ended,
  className = "",
  onExpire,
}: {
  endsAt: string;
  ended?: boolean;
  className?: string;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );
  const [flash, setFlash] = useState(false);
  const prevEndsAt = useRef(endsAt);
  const firedExpire = useRef(false);

  // Detect anti-snipe extension: the deadline moved later than before.
  useEffect(() => {
    const prev = new Date(prevEndsAt.current).getTime();
    const next = new Date(endsAt).getTime();
    if (next > prev + 500) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      prevEndsAt.current = endsAt;
      return () => clearTimeout(t);
    }
    prevEndsAt.current = endsAt;
  }, [endsAt]);

  useEffect(() => {
    if (ended) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setRemaining(ms);
      if (ms === 0 && !firedExpire.current) {
        firedExpire.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, ended, onExpire]);

  const isOver = ended || remaining <= 0;
  const urgent = !isOver && remaining < 60_000;

  return (
    <span
      className={`nums inline-flex items-center rounded-md px-1 ${
        isOver
          ? "text-text-faint"
          : urgent
            ? "text-rose"
            : "text-text"
      } ${flash ? "animate-snipe text-rose" : ""} ${className}`}
    >
      {isOver ? "ENDED" : formatCountdown(remaining)}
    </span>
  );
}
