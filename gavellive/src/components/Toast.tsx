"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastApi {
  toast: (t: { kind?: ToastKind; title: string; body?: string }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald/40 bg-emerald-soft/60 text-emerald",
  error: "border-rose/40 bg-rose-soft/60 text-rose",
  info: "border-border bg-surface-2 text-text",
};

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "✕",
  info: "•",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback(
    ({ kind = "info", title, body }: { kind?: ToastKind; title: string; body?: string }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, kind, title, body }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-md shadow-lg shadow-black/40 ${STYLES[t.kind]}`}
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-current/15 text-xs font-bold">
              {ICONS[t.kind]}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.body && (
                <p className="mt-0.5 text-xs leading-snug text-text-muted">
                  {t.body}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
