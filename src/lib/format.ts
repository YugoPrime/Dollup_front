export function formatPrice(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-MU", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount}`;
  }
}

type WithPrice = {
  variants?:
    | {
        manage_inventory?: boolean | null;
        inventory_quantity?: number | null;
        calculated_price?: {
          calculated_amount?: number | null;
          original_amount?: number | null;
          currency_code?: string | null;
        } | null;
      }[]
    | null;
};

export function getDisplayPrice(product: WithPrice) {
  const variants = product.variants ?? [];
  const inStock = variants.filter(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const pool = inStock.length > 0 ? inStock : variants;
  const variant = pickLowestPricedVariant(pool);
  const cp = variant?.calculated_price;
  return {
    amount: cp?.calculated_amount ?? null,
    original: cp?.original_amount ?? null,
    currency: cp?.currency_code ?? "USD",
    onSale:
      cp?.calculated_amount != null &&
      cp?.original_amount != null &&
      cp.calculated_amount < cp.original_amount,
  };
}

function pickLowestPricedVariant<T extends NonNullable<WithPrice["variants"]>[number]>(
  variants: T[],
): T | undefined {
  let best: T | undefined;
  let bestAmount = Infinity;
  for (const variant of variants) {
    const amount = variant.calculated_price?.calculated_amount;
    if (typeof amount !== "number") {
      if (!best) best = variant;
      continue;
    }
    if (amount < bestAmount) {
      best = variant;
      bestAmount = amount;
    }
  }
  return best;
}

// Sale prices are set as a % off, then rounded DOWN to a multiple of Rs 5,
// which nudges the real discount up: Rs 425 → 210 at 50% off is 50.6%, and
// plain rounding badged it "-51%" under an "up to 50%" banner (7 of the 276
// October sale products did this). Flooring to the 5% step gives back the
// tier the owner set, and never overstates a discount.
const DISCOUNT_STEP_PERCENT = 5;

/** Whole % off, floored to the 5% step (under 5%: the whole %, at least 1). */
export function discountPercent(
  amount: number | null | undefined,
  original: number | null | undefined,
): number | null {
  if (amount == null || original == null || original <= 0 || original <= amount) {
    return null;
  }
  const exact = ((original - amount) * 100) / original;
  if (exact < DISCOUNT_STEP_PERCENT) return Math.max(1, Math.floor(exact));
  return Math.floor(exact / DISCOUNT_STEP_PERCENT) * DISCOUNT_STEP_PERCENT;
}

export function formatDiscountPercent(
  amount: number | null | undefined,
  original: number | null | undefined,
): string | null {
  const pct = discountPercent(amount, original);
  return pct == null ? null : `-${pct}%`;
}
