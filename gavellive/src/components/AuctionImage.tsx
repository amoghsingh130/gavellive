/**
 * Auction artwork. Uses a plain <img> for external URLs (avoids next/image
 * remote-domain config friction) and a deterministic gradient placeholder when
 * no image is set, so cards never look broken.
 */

// A few soft, gallery-ish light gradients picked deterministically from the id.
const GRADIENTS = [
  "from-[#eef0ff] via-[#f3f4f8] to-[#e7e9f5]",
  "from-[#e6f7ef] via-[#f1f6f3] to-[#e3f0ea]",
  "from-[#fdeef1] via-[#f6f1f3] to-[#f7e6ec]",
  "from-[#f0ecff] via-[#f4f2fb] to-[#e9e3fb]",
  "from-[#e9f1fb] via-[#f1f4f8] to-[#e3ecf6]",
];

function pick(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function AuctionImage({
  src,
  alt,
  id,
  className = "",
}: {
  src: string | null;
  alt: string;
  id: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-br ${pick(id)} ${className}`}
    >
      <span className="select-none text-4xl text-accent/30">⚖︎</span>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(91,61,245,0.1),transparent)]" />
    </div>
  );
}
