"use client";

import { doorPrice, todaysDoor } from "@/lib/advent";
import { formatPrice } from "@/lib/format";
import { useAdventNow } from "@/components/advent/useAdventNow";

type AdventPriceInput = {
  amount: number | null;
  categoryHandles: string[];
  productId: string;
  initialNow: number;
};

function useDoorPrice(p: AdventPriceInput, soldOut = false) {
  const now = useAdventNow(p.initialNow);
  if (soldOut || p.amount == null) return null;
  return doorPrice({ amount: p.amount, categoryHandles: p.categoryHandles, productId: p.productId }, now);
}

export function AdventCardTag(p: AdventPriceInput & { soldOut?: boolean }) {
  const hit = useDoorPrice(p, p.soldOut);
  if (!hit) return null;
  return (
    <span className="self-start rounded-r-full bg-coral-500 py-0.5 pl-2 pr-3 font-sans text-[11px] font-bold uppercase tracking-wider text-white">
      {hit.tag}
    </span>
  );
}

export function AdventCardPrice(
  p: AdventPriceInput & { original: number | null; currency: string; soldOut: boolean; onSale: boolean },
) {
  const hit = useDoorPrice(p, p.soldOut);
  if (hit) {
    return (
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-sans text-[16px] font-semibold text-coral-500">
          {formatPrice(hit.price, p.currency)}
        </span>
        <span className="font-sans text-[12px] text-ink-muted line-through">
          {formatPrice(p.amount, p.currency)}
        </span>
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex items-baseline gap-1.5">
      <span
        className={`font-sans text-[16px] font-semibold ${
          p.soldOut ? "text-coral-300" : p.onSale ? "text-coral-500" : "text-ink"
        }`}
      >
        {formatPrice(p.amount, p.currency)}
      </span>
      {p.onSale && (
        <span className="font-sans text-[12px] text-ink-muted line-through">
          {formatPrice(p.original, p.currency)}
        </span>
      )}
    </div>
  );
}

/** PDP: door price + struck current price + door line, or null when no door applies. */
export function useAdventPdp(p: AdventPriceInput) {
  const now = useAdventNow(p.initialNow);
  if (p.amount == null) return null;
  const hit = doorPrice({ amount: p.amount, categoryHandles: p.categoryHandles, productId: p.productId }, now);
  const door = todaysDoor(now);
  return hit && door ? { price: hit.price, day: door.day } : null;
}
