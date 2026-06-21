"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 360° drag-to-rotate hero viewer. The lot photo is mounted on a double-sided
 * 3D card (front = photo, back = a dimmed reverse) that the user drags to spin
 * in full yaw, with release momentum and a slow idle auto-rotate. Reliable and
 * offline-safe — needs only one image, no frame sequence. Falls back to a
 * gradient pedestal when no photo is available.
 */
export default function SpinViewer({
  image,
  alt,
  autoSpin = true,
  className = "",
}: {
  image: string | null;
  alt: string;
  autoSpin?: boolean;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const angle = useRef(-18);
  const tilt = useRef(6);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!dragging.current) {
        // Momentum, decaying; settle into a gentle idle spin.
        if (Math.abs(vel.current) > 0.04) {
          angle.current += vel.current;
          vel.current *= 0.94;
        } else {
          vel.current = 0;
          if (autoSpin) angle.current += 0.12;
        }
        // Ease tilt back toward a slight downward-looking rest angle.
        tilt.current += (6 - tilt.current) * 0.05;
      }
      if (stageRef.current) {
        stageRef.current.style.transform = `rotateX(${tilt.current}deg) rotateY(${angle.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoSpin]);

  function onDown(e: React.PointerEvent) {
    dragging.current = true;
    vel.current = 0;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    setHint(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    angle.current += dx * 0.5;
    vel.current = dx * 0.5;
    tilt.current = Math.max(-22, Math.min(28, tilt.current - dy * 0.3));
  }
  function onUp(e: React.PointerEvent) {
    dragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface to-surface-2 shadow-card ${className}`}
      style={{ perspective: "1400px", touchAction: "none", cursor: "grab" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* soft floor shadow */}
      <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[50%] bg-text/15 blur-xl" />

      <div
        ref={stageRef}
        className="relative h-[72%] w-[72%]"
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {image ? (
          <>
            {/* front */}
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl shadow-card-lg"
              style={{ backfaceVisibility: "hidden" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={alt}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
            {/* back (dimmed reverse) */}
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
                style={{ filter: "brightness(0.5) saturate(0.7)", transform: "scaleX(-1)" }}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-accent-soft to-surface-2 shadow-card-lg">
            <span className="text-5xl text-accent/40">⚖︎</span>
          </div>
        )}
      </div>

      {/* drag hint */}
      <div
        className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface/90 px-3 py-1 text-[11px] font-semibold text-text-muted shadow-card backdrop-blur transition-opacity duration-500 ${
          hint ? "opacity-100" : "opacity-0"
        }`}
      >
        ⟲ drag to rotate
      </div>
    </div>
  );
}
