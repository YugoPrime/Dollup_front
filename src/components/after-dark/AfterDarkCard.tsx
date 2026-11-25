import Image from "next/image";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { toQuickAddProduct } from "@/components/ProductCard";
import { ProductCardQuickAdd } from "@/components/ProductCardActions";
import { toyQuickAddOptions } from "@/lib/after-dark";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import type { ToyFacts } from "@/lib/toy-facts";

// Toy card for the After Dark grid and the toy page's "More from After Dark".
// No advent tags, low-stock badge or wishlist heart.
export function AfterDarkCard({
  product,
  facts,
  imagePriority = false,
}: {
  product: HttpTypes.StoreProduct;
  facts: ToyFacts | null;
  imagePriority?: boolean;
}) {
  const href = `/products/${product.handle}`;
  const price = getDisplayPrice(product);
  const thumb = product.thumbnail ?? product.images?.[0]?.url ?? null;
  // Same rules as ProductCard.
  const inStockVariant = product.variants?.find(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const soldOut = product.variants?.length ? !inStockVariant : false;
  const isMultiVariant = (product.variants?.length ?? 0) > 1;
  // Only the toy page's visible options reach the sheet (a single-value
  // "Size: OS" would become its tap-to-add row), retitled Colour / Size /
  // Choose so Licking / Sucking are text chips, not grey colour dots.
  // Variants keep every value: the sheet only matches on listed options.
  const qa = toQuickAddProduct(product, thumb, price);
  const quickAdd = { ...qa, ...toyQuickAddOptions(product.options ?? [], qa.variants) };
  const pickerLabel =
    quickAdd.options.length > 0 && quickAdd.options.every((o) => o.title === "Colour")
      ? "Select colour"
      : "Select options";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-blush-200 bg-white">
      <div className="relative aspect-[3/4] overflow-hidden bg-blush-100">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          {thumb && (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              preload={imagePriority}
              className="object-cover"
            />
          )}
        </Link>
        {!soldOut && (
          <ProductCardQuickAdd
            tone="wine"
            isMultiVariant={isMultiVariant}
            variantId={isMultiVariant ? null : inStockVariant?.id}
            label={pickerLabel}
            addLabel="Add"
            quickAdd={quickAdd}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <Link
          href={href}
          className="line-clamp-2 min-h-[37px] font-sans text-[14px] font-medium leading-[1.3] text-ink hover:text-wine-800"
        >
          {product.title}
        </Link>
        {facts?.card ? (
          <p className="mt-1 truncate font-sans text-[9px] font-bold uppercase tracking-[.08em] text-champagne-bronze">
            {facts.card}
          </p>
        ) : null}
        <p className="mt-auto pt-2 font-display text-[16px] font-semibold text-ink">
          {formatPrice(price.amount, price.currency)}
        </p>
      </div>
    </div>
  );
}
