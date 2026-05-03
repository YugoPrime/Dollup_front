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
        calculated_price?: {
          calculated_amount?: number | null;
          original_amount?: number | null;
          currency_code?: string | null;
        } | null;
      }[]
    | null;
};

export function getDisplayPrice(product: WithPrice) {
  const variant = product.variants?.[0];
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

export function formatDiscountPercent(
  amount: number | null | undefined,
  original: number | null | undefined,
): string | null {
  if (amount == null || original == null || original <= amount) return null;
  const pct = Math.round(((original - amount) / original) * 100);
  return `-${pct}%`;
}
