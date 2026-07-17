import type { HttpTypes } from "@medusajs/types";

/**
 * Automatic gift items for the 8-year anniversary sale.
 *
 * Medusa's `buyget` promotions DISCOUNT items that are already in the cart —
 * they never add anything. So "Buy 2 lingerie, get a free cuff" cannot work on
 * its own: the customer would have to know to add the cuff themselves. This
 * module closes that gap by putting the gift in the cart for them.
 *
 * ── The safety rule this module is built around ───────────────────────────
 * We are adding items to someone's cart that they did not choose. If the
 * promotion does not actually zero the price, we have just charged them for
 * something they never asked for. So:
 *
 *   1. Every line we add is tagged `metadata.auto_gift`. We only ever modify
 *      or remove lines carrying our own tag — never a line the customer chose.
 *   2. After adding, the caller MUST re-read the cart and call
 *      `giftsToRevert()`. Anything we added that is not actually free gets
 *      pulled straight back out.
 *   3. (2) is also what gates the promotion window. We deliberately do NOT
 *      check dates client-side — the browser clock is not trustworthy, and the
 *      promotion itself is the authority on whether it is running. If the
 *      promo is dormant, the gift is not free, and rule (2) removes it.
 *
 * Never replace (2) with a date check.
 */

type Cart = HttpTypes.StoreCart;
type LineItem = NonNullable<Cart["items"]>[number];

/** Lingerie category — the same one GWP-LINGERIE-CUFF's buy rule targets. */
const LINGERIE_CATEGORY_ID = "pcat_01KN5D9SVBWPSN8PB20JJFVDKF";
/** is2174 handcuffs — the GWP target product. */
const CUFF_PRODUCT_ID = "prod_01KQPN975A65QJVMVFX47DEXBQ";
/**
 * Pink cuff. Deliberately NOT the Red variant: Red is oversold
 * (inventory_quantity -2, manage_inventory on, no backorder), so adding it
 * would fail or oversell further.
 */
const CUFF_VARIANT_ID = "variant_01KQPN97642XQH1X9SSF5T3GEN";
/** is1361 boob tape — BOGO-TAPE buys and targets the same product. */
const TAPE_PRODUCT_ID = "prod_01KQPN0YQFEWSA0WXYAQX0N4YF";

export const GWP_CUFF = "gwp-cuff";
export const BOGO_TAPE = "bogo-tape";

export type GiftAdd = { rule: string; variantId: string; quantity: number };
export type GiftBump = { rule: string; lineId: string; quantity: number };
export type GiftRevert =
  | { rule: string; kind: "remove"; lineId: string }
  | { rule: string; kind: "bump"; lineId: string; quantity: number };

function tagOf(item: LineItem): string | null {
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const t = meta.auto_gift;
  return typeof t === "string" ? t : null;
}

function categoryIdsOf(item: LineItem): string[] {
  // Requires `*items.variant.product.categories` in the cart's field list.
  const product = (item.variant as { product?: { categories?: { id?: string }[] } } | undefined)
    ?.product;
  return (product?.categories ?? []).map((c) => c.id).filter((id): id is string => Boolean(id));
}

/** Units of lingerie in the cart, excluding the cuff itself (it isn't lingerie). */
function lingerieUnits(cart: Cart): number {
  return (cart.items ?? []).reduce((n, i) => {
    if (i.product_id === CUFF_PRODUCT_ID) return n;
    return categoryIdsOf(i).includes(LINGERIE_CATEGORY_ID) ? n + (i.quantity ?? 0) : n;
  }, 0);
}

function findLine(cart: Cart, productId: string): LineItem | undefined {
  return (cart.items ?? []).find((i) => i.product_id === productId);
}

/** True when the line is genuinely free (the promo zeroed it). */
function isFree(item: LineItem): boolean {
  return (item.total ?? 0) === 0;
}

/** True when the line got *some* discount — used for the tape, where only the 2nd unit is free. */
function isDiscounted(item: LineItem): boolean {
  const total = item.total ?? 0;
  const original = item.original_total ?? 0;
  return original > 0 && total < original;
}

/**
 * What to add, given the current cart. Idempotent: returns nothing once the
 * gift is already present, so re-running after a mutation is a no-op and
 * cannot loop.
 */
export function giftsToAdd(cart: Cart | null, declined: string[] = []): GiftAdd[] {
  if (!cart) return [];
  const out: GiftAdd[] = [];

  // GWP: 2+ lingerie units and no cuff in the cart at all (ours or theirs).
  // `declined` is what stops us re-adding a gift the customer just deleted —
  // without it, removeItem's reconcile pass would put it straight back and the
  // customer could never get rid of it.
  if (
    !declined.includes(GWP_CUFF) &&
    lingerieUnits(cart) >= 2 &&
    !findLine(cart, CUFF_PRODUCT_ID)
  ) {
    out.push({ rule: GWP_CUFF, variantId: CUFF_VARIANT_ID, quantity: 1 });
  }
  return out;
}

/** sessionStorage key holding the rules this shopper has explicitly removed. */
export function declinedKey(cartId: string): string {
  return `dub_gift_declined:${cartId}`;
}

export function readDeclined(cartId: string): string[] {
  try {
    const raw = sessionStorage.getItem(declinedKey(cartId));
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addDeclined(cartId: string, rule: string): void {
  try {
    const next = Array.from(new Set([...readDeclined(cartId), rule]));
    sessionStorage.setItem(declinedKey(cartId), JSON.stringify(next));
  } catch {
    /* private mode / storage disabled — worst case the gift comes back */
  }
}

/** The auto_gift tag on a line, or null if the customer chose it themselves. */
export function giftTagOf(item: LineItem): string | null {
  return tagOf(item);
}

/**
 * Quantity bumps. The tape BOGO discounts a second unit of the same product,
 * and Medusa merges same-variant lines — so this is a bump, not an add.
 */
export function giftsToBump(cart: Cart | null, declined: string[] = []): GiftBump[] {
  if (!cart) return [];
  if (declined.includes(BOGO_TAPE)) return [];
  const tape = findLine(cart, TAPE_PRODUCT_ID);
  // Only bump a lone tape we haven't already touched. If the customer chose
  // qty 2+ themselves, leave them alone.
  if (tape && (tape.quantity ?? 0) === 1 && !tagOf(tape)) {
    return [{ rule: BOGO_TAPE, lineId: tape.id, quantity: 2 }];
  }
  return [];
}

/**
 * The safety net. Anything we added that is NOT actually free (promo dormant,
 * window closed, customer removed a qualifying item) gets undone.
 *
 * Only ever touches lines carrying our own `auto_gift` tag.
 */
export function giftsToRevert(cart: Cart | null): GiftRevert[] {
  if (!cart) return [];
  const out: GiftRevert[] = [];

  for (const item of cart.items ?? []) {
    const tag = tagOf(item);
    if (!tag) continue;

    if (tag === GWP_CUFF) {
      // Not free (promo dormant), or no longer qualifies (they removed lingerie).
      if (!isFree(item) || lingerieUnits(cart) < 2) {
        out.push({ rule: GWP_CUFF, kind: "remove", lineId: item.id });
      }
    }

    if (tag === BOGO_TAPE) {
      // We bumped 1 -> 2 expecting the 2nd free. If nothing was discounted,
      // put it back to 1 rather than charge for a tape they didn't pick.
      if (!isDiscounted(item)) {
        out.push({ rule: BOGO_TAPE, kind: "bump", lineId: item.id, quantity: 1 });
      }
    }
  }
  return out;
}

/** Line ids of gifts currently in the cart and genuinely free — for UI badging. */
export function activeGiftLineIds(cart: Cart | null): string[] {
  return (cart?.items ?? [])
    .filter((i) => tagOf(i) && (isFree(i) || isDiscounted(i)))
    .map((i) => i.id);
}
