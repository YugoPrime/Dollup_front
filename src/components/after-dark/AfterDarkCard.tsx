import Image from "next/image";
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { toQuickAddProduct } from "@/components/ProductCard";
import { ProductCardQuickAdd } from "@/components/ProductCardActions";
import { visibleToyOptions } from "@/lib/after-dark";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import type { ToyFacts } from "@/lib/toy-facts";

// Label for the quick-add button when a toy has a real choice to make.
function pickerLabel(product: HttpTypes.StoreProduct): string {
  const opts = visibleToyOptions(product.options ?? []);
  return opts.length > 0 && opts.every((o) => o.label === "Colour") ? "Select colour" : "Select options";
}

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
  // The variant sheet makes its last option the tap-to-add row, so a
  // single-value option ("Size: OS") would become the add button. Drop those;
  // variants keep their values (the sheet only matches on listed options).
  const qa = toQuickAddProduct(product, thumb, price);
  const quickAdd = {
    ...qa,
    options: qa.options.filter((o) => new Set(o.values.map((v) => v.trim()).filter(Boolean)).size >= 2),
  };

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
            label={pickerLabel(product)}
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
