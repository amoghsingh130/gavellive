import Link from "next/link";
import BidderPicker from "./BidderPicker";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-soft bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg shadow-lg shadow-accent/30 transition-transform group-hover:-rotate-6">
              🔨
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-tight text-text">
                Gavel<span className="text-accent">Live</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-faint">
                Aurora DSQL · real-time
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/auctions"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              The floor
            </Link>
            <Link
              href="/#how-it-works"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              How it works
            </Link>
          </nav>
        </div>
        <BidderPicker />
      </div>
    </header>
  );
}
