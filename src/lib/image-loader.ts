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

function pickVariantWidth(requested: number): number {
  for (const w of VARIANT_WIDTHS) {
    if (requested <= w) return w;
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
