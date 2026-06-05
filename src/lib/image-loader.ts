type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const PASSTHROUGH_PREFIXES = [
  "https://cdn.dollupboutique.com/",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/",
];

// Pre-generated WebP variants in R2 (see inventory-audit/scripts/resize-r2-webp.ts).
// Enable by setting NEXT_PUBLIC_USE_R2_VARIANTS=true in Coolify ONLY after the
// resize batch has processed every product. Otherwise variant URLs will 404.
const USE_VARIANTS = process.env.NEXT_PUBLIC_USE_R2_VARIANTS === "true";
const VARIANT_WIDTHS = [400, 800, 1200, 1600] as const;
const CDN_PRODUCT_RE = /^(https:\/\/cdn\.dollupboutique\.com\/(?:products\/[^/]+|homepage\/babe-essentials)\/[^/?#]+)\.(jpe?g|png)(\?.*)?$/i;

// Where each variant bucket takes over. The 400→800 boundary is pushed to 500
// (instead of the bucket's own 400) so small thumbnail rails stay on the 400w
// file rather than jumping to 800w purely because of a DPR-3 phone multiplier.
// A 150px rail slot requests 150×3 = 450 device px — visually a 400w image is
// plenty there and roughly halves the bytes (~55KB → ~20KB per tile). The
// desktop "You may also like" rail (224px @ DPR2 = 448) also stays on 400w.
// Larger slots are unaffected: the PDP mobile hero (`100vw` ≈ 1170) → 1200w,
// the desktop gallery main (50vw/600px @ DPR2 ≈ 1200) → 1200w. Chrome trace
// 2026-06-05 flagged 255KB of oversized rail images from the old
// `requested <= w` boundary, where 450–670px requests rounded UP to 800w.
const VARIANT_BREAKPOINTS: ReadonlyArray<readonly [maxRequested: number, width: number]> = [
  [500, 400],
  [900, 800],
  [1300, 1200],
];

function pickVariantWidth(requested: number): number {
  for (const [maxRequested, width] of VARIANT_BREAKPOINTS) {
    if (requested <= maxRequested) return width;
  }
  return VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}

export default function customImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Local public assets (e.g. /logo.png, /og-default.jpg) — Next.js disables
  // the built-in /_next/image endpoint when `images.loader: "custom"` is set,
  // so the optimizer fallback below 404s. Serve static files verbatim.
  if (src.startsWith("/")) return src;

  if (USE_VARIANTS) {
    const match = src.match(CDN_PRODUCT_RE);
    if (match) {
      const variantWidth = pickVariantWidth(width);
      return `${match[1]}-${variantWidth}w.webp`;
    }
  }

  for (const prefix of PASSTHROUGH_PREFIXES) {
    if (src.startsWith(prefix)) return src;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
