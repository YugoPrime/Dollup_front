// Pure helpers for the /sale grid: the % tier each product sits in, the
// category chips and the default order. Kept free of Medusa calls (like
// products-order.ts) so they can be unit-tested; listSaleProducts in
// products.ts applies them to the shared catalog snapshot.
import { discountPercent, getDisplayPrice } from "./format";
import { deprioritizeCategories } from "./products-order";

type PricedVariant = NonNullable<
  Parameters<typeof getDisplayPrice>[0]["variants"]
>[number];

export type SaleProductLike = {
  id: string;
  created_at?: string | null;
  categories?: { id?: string | null }[] | null;
  variants?: PricedVariant[] | null;
};

/**
 * The % off a product is listed under: the discount on the price its card
 * shows (the cheapest in-stock variant, see getDisplayPrice), so the "50% off"
 * chip only holds cards badged -50%. Falls back to the deepest reduced
 * in-stock variant when the cheapest one is full price. Null = not on sale.
 */
export function productSalePercent(p: SaleProductLike): number | null {
  const price = getDisplayPrice(p);
  if (price.onSale) return discountPercent(price.amount, price.original);
  let deepest: number | null = null;
  for (const v of p.variants ?? []) {
    if (v.manage_inventory && (v.inventory_quantity ?? 0) <= 0) continue;
    const pct = discountPercent(
      v.calculated_price?.calculated_amount,
      v.calculated_price?.original_amount,
    );
    if (pct != null && (deepest == null || pct > deepest)) deepest = pct;
  }
  return deepest;
}

/** Distinct tiers, deepest first: [30, 50, 15, 50] → [50, 30, 15]. */
export function distinctTiers(percents: Iterable<number | null | undefined>): number[] {
  const set = new Set<number>();
  for (const p of percents) if (p != null) set.add(p);
  return [...set].sort((a, b) => b - a);
}

/** `?off=` value → one of the tiers on sale, or null (= all tiers). */
export function parseTierParam(raw: string | undefined, tiers: number[]): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return tiers.includes(n) ? n : null;
}

export type SaleCategory = {
  id: string;
  handle: string;
  name: string;
  parent_category_id: string | null;
};

export type SaleCategoryChip = { handle: string; name: string; count: number };

/**
 * Category chips for the products on sale. Each product counts toward the
 * nearest chip-level category at or above each of its categories (Bikini
 * Sets → Beachwear, Hoodies → Winter); `chipHandles` sets that level. Only
 * chips with products are returned, biggest first.
 */
export function saleCategoryChips(
  products: SaleProductLike[],
  categories: SaleCategory[],
  chipHandles: Iterable<string>,
): SaleCategoryChip[] {
  const chipSet = new Set(chipHandles);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const counts = new Map<string, number>();
  for (const p of products) {
    const chips = new Set<string>();
    for (const pc of p.categories ?? []) {
      // Walk up the tree; the guard stops a malformed parent loop.
      let cur = pc.id ? byId.get(pc.id) : undefined;
      for (let depth = 0; cur && depth < 10; depth++) {
        if (chipSet.has(cur.handle)) {
          chips.add(cur.handle);
          break;
        }
        cur = cur.parent_category_id ? byId.get(cur.parent_category_id) : undefined;
      }
    }
    for (const h of chips) counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const nameByHandle = new Map(categories.map((c) => [c.handle, c.name]));
  return [...counts]
    .map(([handle, count]) => ({ handle, name: nameByHandle.get(handle) ?? handle, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function createdAt(p: SaleProductLike): number {
  const t = p.created_at ? new Date(p.created_at).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/**
 * Default /sale order: deepest discount first, then the shop's usual order
 * within each tier: newest first, with `lastCategoryIds` (After Dark in the
 * all-categories view) after everything else.
 */
export function orderSaleProducts<T extends SaleProductLike>(
  products: T[],
  percents: ReadonlyMap<string, number>,
  lastCategoryIds: Iterable<string>,
): T[] {
  const newest = [...products].sort((a, b) => createdAt(b) - createdAt(a));
  // Both sorts are stable, so the tier sort keeps the order within each tier.
  return deprioritizeCategories(newest, lastCategoryIds).sort(
    (a, b) => (percents.get(b.id) ?? 0) - (percents.get(a.id) ?? 0),
  );
}
