"use client";

import { useRef, useState } from "react";
import type { StressResult, StressProgress } from "@/lib/stress";
import { formatMoney } from "@/lib/format";
import { useToast } from "./Toast";

const PRESETS = [50, 150, 300];

export default function StressPanel({
  auctionId,
  live,
  onComplete,
}: {
  auctionId: string;
  live: boolean;
  onComplete?: () => void;
}) {
  const { toast } = useToast();
  const [bids, setBids] = useState(150);
  const [concurrency, setConcurrency] = useState(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<StressProgress | null>(null);
  const [snaps, setSnaps] = useState<StressProgress[]>([]);
  const [result, setResult] = useState<StressResult | null>(null);
  const [revealed, setRevealed] = useState(0); // how many checks have animated in
  const completedRef = useRef(false);

  async function run() {
    if (running) return;
    setRunning(true);
    setProgress(null);
    setSnaps([]);
    setResult(null);
    setRevealed(0);
    completedRef.current = false;
    try {
      const res = await fetch(`/api/auctions/${auctionId}/stress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bids, concurrency }),
      });
      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // Read the NDJSON stream: progress snapshots, then a terminal message.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line));
        }
      }
    } catch (err) {
      toast({
        kind: "error",
        title: "Stress run failed",
        body: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  }

  function handle(msg: Record<string, unknown> & { type: string }) {
    if (msg.type === "progress") {
      const p = msg as unknown as StressProgress;
      setProgress(p);
      setSnaps((prev) => [...prev.slice(-119), p]);
    } else if (msg.type === "result") {
      const r = msg as unknown as StressResult;
      setResult(r);
      r.checks.forEach((_, i) =>
        setTimeout(() => setRevealed(i + 1), 300 + i * 420),
      );
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    } else if (msg.type === "error") {
      toast({ kind: "error", title: "Stress run failed", body: String(msg.error) });
    }
  }

  const allShown = result != null && revealed >= result.checks.length;
  const showTelemetry = running || progress != null || result != null;

  // Live (or final) headline numbers.
  const txps = result
    ? (result.accepted + result.rejected) / (result.elapsedMs / 1000 || 1)
    : (progress?.throughput ?? 0);
  const p50 = progress?.p50 ?? 0;
  const p99 = progress?.p99 ?? 0;
  const occ = result?.occRetries ?? progress?.occRetries ?? 0;
  const completed = result
    ? result.accepted + result.rejected + result.errored
    : progress?.completed ?? 0;
  const total = result?.requested ?? progress?.total ?? bids;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="border-b border-border-soft px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-soft text-accent">
            ⚡
          </span>
          Concurrency proof
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Fire N genuine concurrent place-bid transactions straight at Aurora
          DSQL — with live telemetry — then verify the invariants against the
          source of truth.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {/* Controls */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-text-muted">
              Concurrent bids
            </label>
            <span className="nums text-sm font-bold text-text">{bids}</span>
          </div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setBids(p)}
                disabled={running}
                className={`nums flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  bids === p
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-border bg-surface text-text-muted hover:border-accent/30"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={2}
            max={500}
            step={1}
            value={bids}
            disabled={running}
            onChange={(e) => setBids(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-accent)]"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-muted">
            Concurrency (parallel writers)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={concurrency}
              disabled={running}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-28 accent-[var(--color-accent)]"
            />
            <span className="nums w-8 text-right text-sm font-bold text-text">
              {concurrency}
            </span>
          </div>
        </div>

        <button
          onClick={run}
          disabled={running || !live}
          className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!live
            ? "Auction closed — restart to run again"
            : running
              ? "Firing bids…"
              : `Run ${bids} concurrent bids`}
        </button>

        {/* Live telemetry */}
        {showTelemetry && (
          <div className="animate-pop space-y-4 pt-1">
            {/* Progress bar */}
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                <span>{result ? "Completed" : "Firing…"}</span>
                <span className="nums">
                  {completed} / {total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-150"
                  style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Live numbers */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Throughput" value={`${Math.round(txps)}`} unit="tx/s" tone="accent" />
              <Metric label="Latency p50" value={`${p50}`} unit="ms" tone="text" />
              <Metric label="Latency p99" value={`${p99}`} unit="ms" tone="text" />
              <Metric label="OCC conflicts" value={`${occ}`} unit="retries" tone="rose" />
            </div>

            {/* Sparklines */}
            <div className="grid grid-cols-2 gap-3">
              <Sparkline
                label="Throughput"
                values={snaps.map((s) => s.throughput)}
                color="var(--color-accent)"
              />
              <Sparkline
                label="OCC conflicts"
                values={snaps.map((s) => s.occRetries)}
                color="var(--color-rose)"
              />
            </div>

            {/* Final metrics + invariants */}
            {result && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Accepted" value={`${result.accepted}`} tone="emerald" />
                  <Metric label="Rejected" value={`${result.rejected}`} tone="text" />
                  <Metric
                    label="Max attempts"
                    value={`${result.maxAttempts}`}
                    unit="on one bid"
                    tone="accent"
                  />
                  <Metric
                    label="Elapsed"
                    value={`${(result.elapsedMs / 1000).toFixed(2)}`}
                    unit="s"
                    tone="text"
                  />
                </div>

                <div className="space-y-2">
                  {result.checks.map((c, i) => {
                    const shown = i < revealed;
                    return (
                      <div
                        key={c.label}
                        className={`flex items-start gap-3 rounded-xl border px-3 py-2 transition-all duration-300 ${
                          !shown
                            ? "border-border-soft bg-surface-2 opacity-50"
                            : c.pass
                              ? "border-emerald/40 bg-emerald-soft"
                              : "border-rose/40 bg-rose-soft"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            !shown
                              ? "bg-surface text-text-faint"
                              : c.pass
                                ? "animate-check bg-emerald/20 text-emerald"
                                : "animate-check bg-rose/20 text-rose"
                          }`}
                        >
                          {!shown ? "·" : c.pass ? "✓" : "✕"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text">{c.label}</p>
                          {shown && (
                            <p className="nums mt-0.5 text-xs text-text-faint">
                              {c.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {allShown && (
                  <div
                    className={`animate-pop rounded-2xl border px-4 py-3 text-center ${
                      result.allPass
                        ? "border-emerald/50 bg-emerald-soft"
                        : "border-rose/50 bg-rose-soft"
                    }`}
                  >
                    <p
                      className={`text-sm font-extrabold ${result.allPass ? "text-emerald" : "text-rose"}`}
                    >
                      {result.allPass ? "✅ ALL INVARIANTS HOLD" : "❌ INVARIANT VIOLATION"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      under {completed} completed bids ·
                      final price{" "}
                      <span className="nums font-semibold text-text">
                        {formatMoney(result.finalHighBid)}
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: "emerald" | "rose" | "accent" | "text";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald"
      : tone === "rose"
        ? "text-rose"
        : tone === "accent"
          ? "text-accent"
          : "text-text";
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p className={`nums text-lg font-bold ${color}`}>
        {value}
        {unit && <span className="ml-1 text-[10px] font-medium text-text-faint">{unit}</span>}
      </p>
    </div>
  );
}

/** Tiny hand-rolled SVG sparkline — no chart library. */
function Sparkline({
  label,
  values,
  color,
}: {
  label: string;
  values: number[];
  color: string;
}) {
  const W = 120;
  const H = 36;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W;
    const y = H - (v / max) * (H - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = pts.length
    ? `${line} L${(pts[pts.length - 1][0]).toFixed(1)},${H} L0,${H} Z`
    : "";
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 p-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none">
        {area && <path d={area} fill={color} opacity={0.12} />}
        {line && (
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}
