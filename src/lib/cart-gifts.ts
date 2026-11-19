import type { HttpTypes } from "@medusajs/types";

/**
 * Opt-in advent gifts, plus the revert safety net for lines we tag ourselves.
 *
 * Nothing is ever added to a bag automatically any more. A door gift (24 Days
 * of Doll Up) is added only when the shopper presses "claim" in the bag
 * (`CartProvider.claimDoorGift`), tagged `metadata.auto_gift = ADVENT_GIFT`.
 * The July anniversary auto-add rules (free cuff, tape BOGO) ended on 31 Jul
 * 2026 and are gone; their revert branches stay as a safety net for bags that
 * were built while they ran.
 *
 * -- The safety rule this module is built around -------------------------
 * A tagged gift line is only worth having if the promotion actually zeroes
 * its price. If it does not, the shopper would be charged for something they
 * did not pay for. So:
 *
 *   1. Every gift line is tagged `metadata.auto_gift`. We only ever modify or
 *      remove lines carrying our own tag, never a line the customer chose.
 *   2. After any cart mutation the caller MUST re-read the cart and call
 *      `giftsToRevert()`. A tagged line that is not actually free gets pulled
 *      straight back out (this also covers the shopper removing every paid
 *      item: the gift stops being free, so it goes).
 *   3. (2) is also what gates the promotion window. We deliberately do NOT
 *      check dates client-side: the browser clock is not trustworthy, and the
 *      promotion itself is the authority on whether it is running.
 *
 * Never replace (2) with a date check.
 */

type Cart = HttpTypes.StoreCart;
type LineItem = NonNullable<Cart["items"]>[number];

/** Lingerie category — the same one GWP-LINGERIE-CUFF's buy rule targets. */
const LINGERIE_CATEGORY_ID = "pcat_01KN5D9SVBWPSN8PB20JJFVDKF";
/** is2174 handcuffs — the GWP target product. */
const CUFF_PRODUCT_ID = "prod_01KQPN975A65QJVMVFX47DEXBQ";

/** `auto_gift` tag on a door gift the shopper claimed in the bag. */
export const ADVENT_GIFT = "advent-gift";
// July anniversary tags, kept only so the revert safety net still recognises them.
export const GWP_CUFF = "gwp-cuff";
export const BOGO_TAPE = "bogo-tape";

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

/** The auto_gift tag on a line, or null if the customer chose it themselves. */
export function giftTagOf(item: LineItem): string | null {
  return tagOf(item);
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

    if (tag === ADVENT_GIFT) {
      // The promotion decides whether the gift is free. Not free = remove.
      if (!isFree(item)) out.push({ rule: ADVENT_GIFT, kind: "remove", lineId: item.id });
    }

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
