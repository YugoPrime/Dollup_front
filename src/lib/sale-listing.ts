// Pure helpers for the /sale grid: the % tier each product sits in, the
// category chips and the default order. Kept free of Medusa calls (like
// products-order.ts) so they can be unit-tested; listSaleProducts in
// products.ts applies them to the shared catalog snapshot.
import { discountPercent, getDisplayPrice } from "./format";

type PricedVariant = NonNullable<
  Parameters<typeof getDisplayPrice>[0]["variants"]
>[number];

export type SaleProductLike = {
  id: string;
  handle?: string | null;
  created_at?: string | null;
  categories?: { id?: string | null; handle?: string | null }[] | null;
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

// "is2138" → 2138. Older imports use other prefixes (tr6, st508, cb10023)
// and carry supplier photos with the price printed on them, so any handle
// not in the IS shape counts as oldest. The IS number is the cheapest proxy
// for photo quality the catalog has.
const IS_HANDLE = /^is(\d+)$/i;
function handleNumber(handle: string | null | undefined): number {
  const m = IS_HANDLE.exec(handle ?? "");
  return m ? Number(m[1]) : -1;
}

export type SaleOrder = {
  /** Pinned first, in this order; handles not on sale are skipped. */
  featuredHandles: readonly string[];
  /** Category handle groups, best first, for the order within a tier. */
  categoryOrder: readonly (readonly string[])[];
};

/**
 * Default /sale order:
 *   1. `featuredHandles` first, in config order.
 *   2. The rest by discount, deepest first.
 *   3. Within a tier, by `categoryOrder` group. Each of a product's
 *      categories counts, as itself or its nearest listed parent (Pajamas →
 *      Lingerie), and the best group wins; no listed group → after all.
 *   4. Then newest first by IS number, non-IS handles last (ties: newest
 *      created_at).
 * Filter after ordering: a chip's subset then keeps rules 2–4, and pinned
 * products lead it whenever they match.
 */
export function orderSaleProducts<T extends SaleProductLike>(
  products: T[],
  percents: ReadonlyMap<string, number>,
  categories: SaleCategory[],
  order: SaleOrder,
): T[] {
  const byHandle = new Map(products.map((p) => [(p.handle ?? "").toLowerCase(), p]));
  const pinned: T[] = [];
  for (const h of order.featuredHandles) {
    const p = byHandle.get(h.toLowerCase());
    if (p && !pinned.includes(p)) pinned.push(p);
  }

  const groupByHandle = new Map<string, number>();
  order.categoryOrder.forEach((group, i) => {
    for (const h of group) groupByHandle.set(h, i);
  });
  const byId = new Map(categories.map((c) => [c.id, c]));
  const unranked = order.categoryOrder.length;
  const categoryRank = (p: T): number => {
    let best = unranked;
    for (const pc of p.categories ?? []) {
      let cur = pc.id ? byId.get(pc.id) : undefined;
      let handle = pc.handle ?? cur?.handle;
      // Walk up the tree; the guard stops a malformed parent loop.
      for (let depth = 0; handle && depth < 10; depth++) {
        const rank = groupByHandle.get(handle);
        if (rank !== undefined) {
          best = Math.min(best, rank);
          break;
        }
        cur = cur?.parent_category_id ? byId.get(cur.parent_category_id) : undefined;
        handle = cur?.handle;
      }
    }
    return best;
  };

  const rest = products
    .filter((p) => !pinned.includes(p))
    .map((p) => ({
      p,
      tier: percents.get(p.id) ?? 0,
      rank: categoryRank(p),
      number: handleNumber(p.handle),
      created: createdAt(p),
    }))
    .sort(
      (a, b) =>
        b.tier - a.tier ||
        a.rank - b.rank ||
        b.number - a.number ||
        b.created - a.created,
    )
    .map((k) => k.p);
  return [...pinned, ...rest];
}
