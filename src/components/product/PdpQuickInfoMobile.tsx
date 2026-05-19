"use client";

import { formatPrice, formatDiscountPercent } from "@/lib/format";
import type { SizeAvailability } from "@/lib/product-meta";

export const PDP_SELECT_SIZE_EVENT = "pdp:select-size";

type Props = {
  price: {
    amount: number | null;
    original: number | null;
    currency: string;
    onSale: boolean;
  };
  sizes: SizeAvailability[];
  buyAnchorId: string;
};

/**
 * Mobile-only summary docked between the breadcrumb and the gallery so the
 * customer sees price + size availability without scrolling. Tapping a size
 * pill scrolls to the buy box and fires `pdp:select-size` so ProductBuy can
 * preselect that size.
 */
export function PdpQuickInfoMobile({ price, sizes, buyAnchorId }: Props) {
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const handlePick = (value: string, available: boolean) => {
    if (!available) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PDP_SELECT_SIZE_EVENT, { detail: { value } }),
      );
      const target = document.getElementById(buyAnchorId);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-blush-100 bg-cream px-3 py-2.5 md:hidden">
      <div className="flex min-w-0 flex-col">
        <span className="font-display text-[20px] leading-none text-coral-500">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className="font-sans text-[11px] text-ink-muted line-through">
              {formatPrice(price.original, price.currency)}
            </span>
            {discountPct && (
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-coral-500">
                Save {discountPct.replace("-", "")}
              </span>
            )}
          </span>
        )}
      </div>

      {sizes.length > 0 && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {sizes.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handlePick(s.value, s.available)}
              aria-label={
                s.available ? `Jump to size ${s.value}` : `Size ${s.value} sold out`
              }
              aria-disabled={!s.available}
              className={
                s.available
                  ? "min-w-[32px] rounded-md border border-ink bg-white px-2 py-1 font-sans text-[11px] font-semibold text-ink transition-colors hover:border-coral-500 hover:text-coral-500"
                  : "min-w-[32px] rounded-md border border-blush-100 bg-blush-100 px-2 py-1 font-sans text-[11px] font-semibold text-ink-muted line-through"
              }
            >
              {s.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
