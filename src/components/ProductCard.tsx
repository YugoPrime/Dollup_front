import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";
import { colorNameToHex } from "@/lib/colors";
import {
  ProductCardQuickAdd,
  ProductCardWishlistButton,
} from "@/components/ProductCardActions";

type Product = HttpTypes.StoreProduct;

const LOW_STOCK_THRESHOLD = 5;
const MAX_COLOR_DOTS = 4;

// "New" = product carries the highest-numbered `collectionN` tag in the catalog.
// Auto-rotates: when collection29 lands and gets a product, collection28 stops
// being "new" without a code change. Resolved server-side and threaded through
// each ProductCard via the `latestCollectionTag` prop on grids/rails.
function isInLatestCollection(product: Product, latestTag: string | null) {
  if (!latestTag) return false;
  return (product.tags ?? []).some(
    (t) => (t.value ?? "").toLowerCase() === latestTag.toLowerCase(),
  );
}

// Recency fallback for the "New" badge: a fresh drop isn't always tagged with a
// `collectionN` tag (the import pipeline sometimes skips it), so flag anything
// created within the window as new too. Keeps the badge correct for new
// arrivals regardless of tagging — same source of truth as /shop?sort=new.
const NEW_ARRIVAL_WINDOW_DAYS = 14;
function isRecentlyCreated(product: Product): boolean {
  const raw = (product as { created_at?: string | null }).created_at;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function isNewArrival(product: Product, latestTag: string | null): boolean {
  return isInLatestCollection(product, latestTag) || isRecentlyCreated(product);
}

// Canonical size map mirroring the shop filter's SIZE_ALIASES so a card can
// tell whether a variant matches the size(s) the shopper filtered by.
const SIZE_ALIAS: Record<string, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL",
  "2xl": "2XL", xxl: "2XL", "3xl": "3XL", xxxl: "3XL", "4xl": "4XL",
  "free size": "Free Size", freesize: "Free Size", "free-size": "Free Size",
  "one size": "Free Size",
};
function normalizeSize(raw: string): string {
  const key = (raw ?? "").trim().toLowerCase();
  return SIZE_ALIAS[key] ?? (raw ?? "").trim();
}
function variantSizeValue(variant: NonNullable<Product["variants"]>[number]): string | null {
  for (const opt of variant.options ?? []) {
    if ((opt.option?.title ?? "").toLowerCase() === "size") return opt.value ?? null;
  }
  return null;
}
// True when no size filter is active, the product has no size option, or the
// variant's size is one of the selected sizes. Keeps size-less products
// (accessories, one-size) from being over-filtered.
function variantMatchesSizes(
  variant: NonNullable<Product["variants"]>[number],
  sizes: string[] | null,
): boolean {
  if (!sizes || sizes.length === 0) return true;
  const sv = variantSizeValue(variant);
  if (sv == null) return true;
  const norm = normalizeSize(sv);
  return sizes.some((s) => normalizeSize(s) === norm);
}
function variantInStock(
  variant: NonNullable<Product["variants"]>[number],
): boolean {
  return !variant.manage_inventory || (variant.inventory_quantity ?? 0) > 0;
}

// Low-stock badge, scoped to the filtered size so "1 left" reflects the size
// the shopper is actually looking at (not an unrelated size's leftover unit).
function getLowStockMessage(product: Product, selectedSizes: string[] | null): string | null {
  const lowVariants = (product.variants ?? []).filter(
    (v) =>
      v.manage_inventory &&
      v.inventory_quantity != null &&
      v.inventory_quantity > 0 &&
      v.inventory_quantity < LOW_STOCK_THRESHOLD &&
      variantMatchesSizes(v, selectedSizes),
  );
  if (!lowVariants.length) return null;
  const minQty = Math.min(...lowVariants.map((v) => v.inventory_quantity ?? 0));
  return `${minQty} left`;
}

// Colors the shopper can actually buy. When a size filter is active, only
// colors that are in stock IN THAT SIZE count — so a size=L grid never shows a
// white swatch when only burgundy is available in L.
function getColorOptions(product: Product, selectedSizes: string[] | null) {
  const colorOption = product.options?.find(
    (o) => (o.title ?? "").toLowerCase() === "color",
  );
  if (!colorOption) return [];
  const allColors = (colorOption.values ?? [])
    .map((v) => v.value)
    .filter(Boolean) as string[];

  const inStockColors = new Set<string>();
  for (const variant of product.variants ?? []) {
    if (!variantInStock(variant)) continue;
    if (!variantMatchesSizes(variant, selectedSizes)) continue;
    for (const opt of variant.options ?? []) {
      const title = (opt.option?.title ?? "").toLowerCase();
      if (title === "color" && opt.value) {
        inStockColors.add(opt.value);
      }
    }
  }

  if (inStockColors.size === 0) return allColors;
  return allColors.filter((c) => inStockColors.has(c));
}

function getVariantPickerLabel(product: Product): string {
  const titles = (product.options ?? [])
    .map((o) => (o.title ?? "").toLowerCase())
    .filter(Boolean);
  const hasSize = titles.some((t) => t === "size");
  const hasColor = titles.some((t) => t === "color");
  if (hasSize) return "Select size";
  if (hasColor) return "Select color";
  return "Select options";
}

function pickImageForColor(product: Product, color: string | null): string | null {
  const fallback = product.thumbnail ?? product.images?.[0]?.url ?? null;
  if (!color) return fallback;
  const images = product.images ?? [];

  // Prefer variant metadata.image_urls (admin-curated, authoritative) — same
  // source of truth the PDP uses. Slug matching alone would miss e.g. a
  // "Burgandy" variant whose image files are named "burgundy", silently
  // falling back to the (white) thumbnail.
  const metaSet = new Set<string>();
  for (const v of product.variants ?? []) {
    const hasColor = (v.options ?? []).some(
      (o) =>
        (o.option?.title ?? "").toLowerCase() === "color" &&
        (o.value ?? "").toLowerCase() === color.toLowerCase(),
    );
    if (!hasColor) continue;
    const meta = (v.metadata ?? {}) as { image_urls?: unknown };
    if (Array.isArray(meta.image_urls)) {
      for (const u of meta.image_urls) {
        if (typeof u === "string" && u) metaSet.add(u);
      }
    }
  }
  const fromMeta = images.find((img) => metaSet.has(img.url ?? ""));
  if (fromMeta?.url) return fromMeta.url;

  const needle = color.toLowerCase();
  const slug = needle.replace(/\s+/g, "-");
  const match = images.find((img) => {
    const url = (img.url ?? "").toLowerCase();
    if (!url) return false;
    return (
      url.includes(`/${needle}`) ||
      url.includes(`-${needle}`) ||
      url.includes(`_${needle}`) ||
      url.includes(`${needle}.`) ||
      url.includes(`/${slug}`) ||
      url.includes(`-${slug}`)
    );
  });
  return match?.url ?? fallback;
}

export function ProductCard({
  product,
  latestCollectionTag = null,
  imageSizes = "(max-width: 768px) 50vw, 25vw",
  imagePriority = false,
  selectedColor = null,
  selectedSizes = null,
}: {
  product: Product;
  latestCollectionTag?: string | null;
  imageSizes?: string;
  imagePriority?: boolean;
  selectedColor?: string | null;
  selectedSizes?: string[] | null;
}) {
  const price = getDisplayPrice(product);
  const inStockVariant = product.variants?.find(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const inStock = !!inStockVariant;
  const soldOut = product.variants?.length ? !inStock : false;
  const lowStockMsg = getLowStockMessage(product, selectedSizes);
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const colors = getColorOptions(product, selectedSizes);
  const thumb = pickImageForColor(product, selectedColor ?? colors[0] ?? null);
  const isMultiVariant = (product.variants?.length ?? 0) > 1;

  return (
    <div className="group relative block overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(229,96,74,0.06)] transition-all duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.16)]">
      <div className="relative aspect-[3/4] overflow-hidden bg-blush-100">
        {soldOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Sold Out
            </span>
          </div>
        )}

        <div className="absolute left-2 top-2 z-[3] flex flex-col gap-1.5">
          {isNewArrival(product, latestCollectionTag) && (
            <span className="rounded bg-coral-500 px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-white">
              New
            </span>
          )}
          {discountPct && (
            <span className="rounded bg-coral-500 px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-white">
              {discountPct}
            </span>
          )}
          {lowStockMsg && !discountPct && (
            <span className="rounded border border-coral-500 bg-white px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-coral-500">
              {lowStockMsg}
            </span>
          )}
        </div>

        {thumb && (
          <Image
            src={thumb}
            alt={product.title}
            fill
            sizes={imageSizes}
            priority={imagePriority}
            className="object-cover object-top"
          />
        )}

        {!soldOut && (
          <ProductCardQuickAdd
            productHandle={product.handle}
            isMultiVariant={isMultiVariant}
            variantId={isMultiVariant ? null : inStockVariant?.id}
            label={getVariantPickerLabel(product)}
          />
        )}
      </div>

      <div className="flex min-h-[110px] flex-col px-3 pb-3 pt-2.5">
        <Link
          href={`/products/${product.handle}`}
          className="line-clamp-2 min-h-[34px] font-sans text-[12px] leading-[1.3] text-ink before:absolute before:inset-0 before:z-[1] before:content-['']"
        >
          {product.title}
        </Link>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span
            className={`font-sans text-[13px] font-bold ${
              soldOut ? "text-coral-300" : price.onSale ? "text-coral-500" : "text-ink"
            }`}
          >
            {formatPrice(price.amount, price.currency)}
          </span>
          {price.onSale && (
            <span className="font-sans text-[11px] text-ink-muted line-through">
              {formatPrice(price.original, price.currency)}
            </span>
          )}
        </div>
        <div className="mt-auto flex h-4 items-center gap-1 pt-1.5">
          {colors.length > 1 && (
            <>
              {colors.slice(0, MAX_COLOR_DOTS).map((c) => (
                <span
                  key={c}
                  title={c}
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ background: colorNameToHex(c) }}
                />
              ))}
              {colors.length > MAX_COLOR_DOTS && (
                <span className="flex h-3 min-w-[18px] items-center justify-center rounded-full border border-ink-muted bg-white px-1 font-sans text-[7px] font-bold text-ink-muted">
                  +{colors.length - MAX_COLOR_DOTS}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <ProductCardWishlistButton productId={product.id} />
    </div>
  );
}
