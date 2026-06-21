/**
 * Curated item media, keyed by a keyword that appears in the auction title.
 * This keeps rich lot imagery in typed code without a DSQL schema change. The
 * DB still stores a single primary `image_url`, so SSR cards work from the DB
 * alone; detail/landing pages can look up matching galleries here.
 */

export interface ItemMedia {
  gallery: string[]; // ordered angle stills (first = primary)
  /** Only set this when a lot has a genuine 360-friendly media treatment. */
  spin?: boolean;
}

export interface CatalogEntry {
  title: string;
  description: string;
  keys: string[];
  media: ItemMedia;
}

const lot = (name: string) => `/lots/${name}`;

// Each entry's `keys` are matched (case-insensitive substring) against the
// auction title. First match wins.
const ENTRIES: CatalogEntry[] = [
  {
    title:
      "1965 Patek Philippe Grand Complications Perpetual Chronograph Hand-Wind White Dial Men's Watch",
    description:
      "A gold Patek Philippe perpetual chronograph with a white dial and black leather strap. Estimate: $90,000-$140,000.",
    keys: ["patek", "philippe", "chronograph", "watch"],
    media: {
      gallery: [lot("patek-gold-chronograph.jpg")],
    },
  },
  {
    title: "Vintage Burgundy 1967 Ford Mustang",
    description:
      "A well-kept vintage burgundy Ford Mustang with chrome trim and collector-driver presence. Estimate: $45,000-$65,000.",
    keys: ["mustang", "ford", "rangoon", "porsche", "911", "carrera"],
    media: {
      gallery: [lot("ford-mustang-red.jpg")],
    },
  },
  {
    title: "Vintage Tufted Leather Chesterfield Armchair in Red with Gold Rims",
    description:
      "An ornate red tufted armchair with carved gold-toned detailing and an intricate salon silhouette. Estimate: $2,500-$4,500.",
    keys: ["giltwood", "velvet", "salon", "chair", "jordan", "sneaker", "air"],
    media: {
      gallery: [lot("giltwood-velvet-chair.jpg")],
    },
  },
  {
    title: "Art Deco Diamond and Pearl Fan Brooch",
    description:
      "A fan-form brooch with diamond accents and a pendant pearl drop, photographed against black fabric. Estimate: $14,000-$22,000.",
    keys: ["brooch", "diamond", "pearl", "deco"],
    media: {
      gallery: [lot("diamond-pearl-brooch.jpg")],
    },
  },
  {
    title: "Ricoh 500 G 35mm Rangefinder Camera",
    description:
      "A 1970s compact 35mm rangefinder with fixed lens and original body styling. Estimate: $180-$320.",
    keys: ["ricoh", "500", "rangefinder", "camera", "leica"],
    media: {
      gallery: [lot("ricoh-500g-rangefinder.webp")],
    },
  },
  {
    title:
      "Foundation Isaac Asimov, First Edition Classic Vintage Science Fiction Paperback",
    description:
      "A collectible vintage paperback edition of Isaac Asimov's Foundation, selected for rare-book bidding. Estimate: $400-$900.",
    keys: ["asimov", "foundation", "avon", "paperback", "dune", "herbert"],
    media: {
      gallery: [lot("asimov-foundation-paperback.jpg")],
    },
  },
];

function findCatalogEntry(title: string | null | undefined): CatalogEntry | null {
  if (!title) return null;
  const t = title.toLowerCase();
  for (const e of ENTRIES) {
    if (e.keys.some((k) => t.includes(k))) return e;
  }
  return null;
}

export function getItemMedia(title: string | null | undefined): ItemMedia | null {
  return findCatalogEntry(title)?.media ?? null;
}

export function displayItemTitle(title: string): string {
  return findCatalogEntry(title)?.title ?? title;
}

export function displayItemDescription(title: string, description?: string | null): string | null {
  return findCatalogEntry(title)?.description ?? description ?? null;
}

/** The primary still for a title (for DB seeding / SSR thumbnails). */
export function primaryImage(title: string): string | null {
  return getItemMedia(title)?.gallery[0] ?? null;
}
