// The body glue's own product page (IS2382): the copy, the products it features and two pure rules.
// Rahvi, 26 Nov 2026: "need to change the full design to sell the product", glue only for now.
// Client-safe: no server-only imports. Copy is the approved mockup's; change it there first.

export const GLUE_HANDLE = "is2382"

/** The clean bottle shot. The image loader serves its 400–1600w variants. */
export const GLUE_HERO_IMAGE = "https://cdn.dollupboutique.com/homepage/babe-essentials/is2382.jpg"

/**
 * Set when the clip exists; null hides the "See it hold" section.
 * A clip on cdn.dollupboutique.com also needs that host in `media-src` (next.config.ts CSP).
 */
export const GLUE_VIDEO: { src: string; poster: string } | null = null

export const GLUE_COPY = {
  kicker: "Essentials",
  headline: ["Your dress", "stays put."],
  lead: "Roll it on, press the fabric, and your strapless, off-shoulder and low-cut outfits stay exactly where you put them.",
  seal: ["Extreme", "hold"],
  stats: [
    ["30–60 s", "to set"],
    ["50 ml", "roll-on, many outfits"],
  ],
  extras: "Sweat-proof · Water-resistant · Latex-free",
  tip: ["Heavier fabric?", "Use a slightly thicker layer. You can top it up during the night."],
  occasionLine: "Yes, even on a windy day.",
  video: {
    title: ["The cyclone", "test"],
    text: "Hair everywhere, a chair in the air, and a dress that doesn't move. Watch the 12 seconds.",
  },
} as const

/** How far to zoom into a product photo so the neckline shows in a small card. */
export type Crop = { scale: number; origin: string }
export type Hold = { handle: string; label: string; line: string; crop: Crop | null }

/** The four dresses under "What it holds in place". Crops are tuned to each product's main photo. */
export const HOLDS: Hold[] = [
  { handle: "is2466", label: "Strapless", line: "No more pulling it up all night.", crop: { scale: 1.7, origin: "50% 6%" } },
  { handle: "is2462", label: "Off-shoulder", line: "Stays exactly where you set it.", crop: null },
  { handle: "is2485", label: "Plunging necklines", line: "Sits flat. No gaping.", crop: { scale: 1.25, origin: "58% 0%" } },
  { handle: "is2453", label: "Tube and bandeau", line: "Stays up while you dance.", crop: { scale: 1.7, origin: "46% 6%" } },
]

export const ALSO_HOLDS = [
  "Backless and low-back dresses: the edges stay flat",
  "Slipping straps: they stay on your shoulder",
  "Bandeau bikini tops and pareos on the beach",
  "Knee-high socks and stockings: they stay up",
  "Dance and stage costumes",
]

export const STEPS = [
  { title: "Start with clean, dry skin", text: "No lotion, oil, perfume or powder where you apply it." },
  { title: "Roll a thin line", text: "Onto your skin, where the edge of the fabric will sit." },
  { title: "Wait 30 to 60 seconds", text: "Until it feels tacky." },
  { title: "Press the fabric on", text: "Hold it firmly for a few seconds. Give it a minute or two before you dance." },
]

export const OCCASIONS = [
  "Weddings",
  "Saree and lehenga blouses",
  "Christmas parties",
  "New Year's Eve",
  "Birthdays",
  "Date nights",
  "Graduation balls",
  "Photoshoots",
  "Séga and dance shows",
  "Beach days",
  "Catamaran trips",
]

export const FAQ = [
  {
    q: "How do I take it off?",
    a: "Wet the area with a warm, damp cloth, then peel the fabric away gently. Wash your skin with warm water and soap, and wash the garment as usual.",
  },
  {
    q: "What about delicate fabrics?",
    a: "With satin, silk or dry-clean-only pieces, try it first on an inside seam and spot-clean with a damp cloth.",
  },
  { q: "Can I swim with it?", a: "It is water-resistant, not made for swimming. Reapply after a swim." },
  {
    q: "Is it okay for my skin?",
    a: "Do a patch test first: a little on your inner arm, then wait 15 minutes. Stop if your skin turns red or itchy. Don't use it on broken or irritated skin, or near your eyes.",
  },
  { q: "How do I store it?", a: "Close the cap well and keep the bottle upright, away from heat and sun." },
]

export type Pair = { handle: string; label: string }
export const PAIRS: Pair[] = [
  { handle: "is1361", label: "Boob Tape" },
  { handle: "is1362", label: "Nipple Covers" },
]

export function isGluePage(p: { handle?: string | null } | null | undefined): boolean {
  return (p?.handle ?? "").toLowerCase() === GLUE_HANDLE
}

type VariantStock = { manage_inventory?: boolean | null; inventory_quantity?: number | null }
export type FeaturedSource = { thumbnail?: string | null; variants?: VariantStock[] | null }

/** Same rule as the product page's buy button: untracked stock, or at least one unit. */
export function isBuyable(p: FeaturedSource): boolean {
  return (p.variants ?? []).some((v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0)
}

/**
 * The featured products to draw, in config order. A product that is missing, has no photo or has
 * nothing left to buy is dropped: the page never sends a shopper to a dress she can't order.
 */
export function featuredCards<H extends { handle: string }, T extends FeaturedSource>(
  items: H[],
  byHandle: Record<string, T | null | undefined>,
): Array<H & { product: T }> {
  const out: Array<H & { product: T }> = []
  for (const item of items) {
    const product = byHandle[item.handle]
    if (!product || !product.thumbnail || !isBuyable(product)) continue
    out.push({ ...item, product })
  }
  return out
}

/**
 * The tick list under the dress photos. A use whose dress isn't pictured (sold out, unlisted, or the
 * photo grid is hidden) moves into the list, so the page never stops saying the glue holds it.
 */
export function tickListLabels(holds: Hold[], picturedHandles: string[], also: string[]): string[] {
  const pictured = new Set(picturedHandles)
  return holds.filter((h) => !pictured.has(h.handle)).map((h) => h.label).concat(also)
}

// Rahvi's "special promo Rs 475 for December": the Medusa price list runs 1–31 Dec 2026, Mauritius time.
const DECEMBER_START_MS = Date.parse("2026-12-01T00:00:00+04:00")
const DECEMBER_END_MS = Date.parse("2027-01-01T00:00:00+04:00")

/** The tag beside a reduced price. Null outside December 2026 or at full price. */
export function decemberPriceLabel(now: number, onSale: boolean): string | null {
  return onSale && now >= DECEMBER_START_MS && now < DECEMBER_END_MS ? "December price" : null
}
