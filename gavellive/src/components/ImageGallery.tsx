"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import AuctionImage from "./AuctionImage";

/**
 * Swipe/drag multi-photo viewer. Pointer/touch drag to advance, arrows, dot
 * indicators, keyboard arrows, and a subtle parallax tilt on hover. Uses
 * next/image for the curated Unsplash stills; falls back to the gradient
 * placeholder when no photos are available.
 */
export default function ImageGallery({
  images,
  alt,
  fallbackId,
  className = "",
}: {
  images: string[];
  alt: string;
  fallbackId: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // px offset while dragging
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const startX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className={`overflow-hidden rounded-3xl border border-border ${className}`}>
        <AuctionImage src={null} alt={alt} id={fallbackId} className="h-full w-full" />
      </div>
    );
  }

  const count = images.length;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const go = (i: number) => setIndex(clamp(i));

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) {
      // hover parallax tilt when not dragging
      const r = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: -py * 5, y: px * 6 });
      return;
    }
    setDrag(e.clientX - startX.current);
  }
  function endDrag() {
    if (startX.current != null) {
      if (drag < -40) go(index + 1);
      else if (drag > 40) go(index - 1);
    }
    startX.current = null;
    setDrag(0);
  }

  const width = trackRef.current?.clientWidth ?? 1;
  const pct = (-index * 100) + (drag / width) * 100;

  return (
    <div
      className={`group relative select-none overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-card ${className}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={() => {
        endDrag();
        setTilt({ x: 0, y: 0 });
      }}
      style={{ perspective: "1200px", cursor: startX.current != null ? "grabbing" : "grab" }}
    >
      <div
        ref={trackRef}
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(${pct}%) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transitionDuration: startX.current != null ? "0ms" : "300ms",
        }}
      >
        {images.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0">
            <Image
              src={src}
              alt={`${alt} — view ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/90 text-text shadow-card backdrop-blur transition-opacity hover:bg-surface disabled:opacity-0"
          >
            ‹
          </button>
          <button
            aria-label="Next photo"
            onClick={() => go(index + 1)}
            disabled={index === count - 1}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/90 text-text shadow-card backdrop-blur transition-opacity hover:bg-surface disabled:opacity-0"
          >
            ›
          </button>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((src, i) => (
              <span
                key={src}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-text" : "w-1.5 bg-text/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
