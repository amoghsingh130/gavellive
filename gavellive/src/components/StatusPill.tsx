type PillState = "live" | "ending-soon" | "ended" | "sold";

const CONFIG: Record<PillState, { label: string; className: string; dot: string }> = {
  live: {
    label: "LIVE",
    className: "border-emerald/40 bg-emerald-soft/50 text-emerald",
    dot: "bg-emerald",
  },
  "ending-soon": {
    label: "ENDING SOON",
    className: "border-rose/40 bg-rose-soft/50 text-rose",
    dot: "bg-rose animate-pulse",
  },
  ended: {
    label: "ENDED",
    className: "border-border bg-surface-2 text-text-faint",
    dot: "bg-text-faint",
  },
  sold: {
    label: "SOLD",
    className: "border-accent/40 bg-accent-soft/40 text-accent",
    dot: "bg-accent",
  },
};

export default function StatusPill({ state }: { state: PillState }) {
  const c = CONFIG[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export type { PillState };
