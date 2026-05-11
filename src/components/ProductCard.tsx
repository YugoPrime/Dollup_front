import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";
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

function getLowStockMessage(product: Product): string | null {
  const lowVariants = (product.variants ?? []).filter(
    (v) =>
      v.manage_inventory &&
      v.inventory_quantity != null &&
      v.inventory_quantity > 0 &&
      v.inventory_quantity < LOW_STOCK_THRESHOLD,
  );
  if (!lowVariants.length) return null;
  const minQty = Math.min(...lowVariants.map((v) => v.inventory_quantity ?? 0));
  return `${minQty} left`;
}

function getColorOptions(product: Product) {
  const colorOption = product.options?.find(
    (o) => (o.title ?? "").toLowerCase() === "color",
  );
  if (!colorOption) return [];
  return (colorOption.values ?? []).map((v) => v.value).filter(Boolean) as string[];
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

function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    black: "#1c1010",
    white: "#ffffff",
    coral: "#E5604A",
    blush: "#F2DDD8",
    cream: "#FAF6F4",
    nude: "#F2DDD8",
    pink: "#F8D5CD",
    red: "#B8412C",
    green: "#3a5a40",
    blue: "#85C1E9",
    yellow: "#F4D03F",
    grey: "#8a7773",
    gray: "#8a7773",
    brown: "#5e4030",
  };
  return map[name.toLowerCase()] ?? "#8a7773";
}

export function ProductCard({
  product,
  latestCollectionTag = null,
}: {
  product: Product;
  latestCollectionTag?: string | null;
}) {
  const price = getDisplayPrice(product);
  const inStockVariant = product.variants?.find(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const inStock = !!inStockVariant;
  const soldOut = product.variants?.length ? !inStock : false;
  const lowStockMsg = getLowStockMessage(product);
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const thumb = product.thumbnail ?? product.images?.[0]?.url ?? null;
  const colors = getColorOptions(product);
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
          {isInLatestCollection(product, latestCollectionTag) && (
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
            sizes="(max-width: 768px) 50vw, 25vw"
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
