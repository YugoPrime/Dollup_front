// Client-safe: the mystery box page, its client and the teasers all read it.
import { SALE_CAMPAIGN, isSaleActive, muLongDate } from "./sale-campaign";

export type CanonicalSize =
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "2XL"
  | "3XL"
  | "4XL"
  | "FREE";

export type MysteryBoxSlot = {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  size: string;
  thumbnail: string | null;
  price_mur: number;
  available_quantity: number | null;
};

export type MysteryBox = {
  id: string;
  size: CanonicalSize;
  slots: MysteryBoxSlot[];
  total_value_mur: number;
  flat_price_mur: number;
};

export const MYSTERY_BOX_FLAT_PRICE_MUR = 3500;
export const MYSTERY_BOX_SLOT_COUNT = 5;
/**
 * The 5 pieces must add up to at least this at their normal price, so every
 * box saves at least Rs 500 on the flat price. A spin under it is re-rolled.
 */
export const MYSTERY_BOX_MIN_VALUE_MUR = 4000;

/**
 * Never in a box (owner, 25 Nov 2026). Same lists as the backend gate in
 * dollup-medusa src/workflows/mystery-box-eligibility.ts: keep them equal.
 * - collection30 = the Ali30 new arrivals, sold at full price.
 * - intimates + toys = After Dark.
 */
export const MYSTERY_BOX_EXCLUDED_TAGS = ["collection30"];
export const MYSTERY_BOX_EXCLUDED_CATEGORY_HANDLES = ["intimates", "toys"];

type ProductForBox = {
  discountable?: boolean | null;
  metadata?: unknown;
  tags?: Array<{ value?: string | null } | null> | null;
  categories?: Array<{ handle?: string | null } | null> | null;
};

/** Whether a product may go in a box at all (its variants are checked apart). */
export function isMysteryBoxProduct(product: ProductForBox): boolean {
  if (product.discountable === false) return false;
  const meta = product.metadata;
  if (meta && typeof meta === "object" && (meta as Record<string, unknown>).unlisted === true) {
    return false;
  }
  const tags = (product.tags ?? []).map((t) => (t?.value ?? "").trim().toLowerCase());
  if (tags.some((t) => MYSTERY_BOX_EXCLUDED_TAGS.includes(t))) return false;
  const cats = (product.categories ?? []).map((c) => (c?.handle ?? "").toLowerCase());
  return !cats.some((h) => MYSTERY_BOX_EXCLUDED_CATEGORY_HANDLES.includes(h));
}

/**
 * True when the variant's price is already cut by a sale price list. Such a
 * piece never goes in a box: the box price only works against full prices.
 */
export function isSalePriced(
  price: { calculated_amount?: number | null; original_amount?: number | null } | null | undefined,
): boolean {
  const calculated = Number(price?.calculated_amount);
  const original = Number(price?.original_amount);
  return Number.isFinite(calculated) && Number.isFinite(original) && original > calculated;
}

/**
 * The box is off while a sale runs (owner, 25 Nov 2026): the pool would be
 * priced at sale prices and 5 pieces can be worth less than the flat price.
 * Follows SALE_CAMPAIGN's dates, so the next sale switches it off by itself.
 */
export function isMysteryBoxPaused(now: Date | number = Date.now()): boolean {
  return isSaleActive(now);
}

/** "Monday 30 November": the first Mauritius day after the current sale. */
export function mysteryBoxReopensLabel(): string {
  return muLongDate(new Date(Date.parse(SALE_CAMPAIGN.endsAt) + 1000).toISOString());
}

function groupByProduct(pool: MysteryBoxSlot[]): Map<string, MysteryBoxSlot[]> {
  // A box holds `count` distinct parents: no two variants of the same product
  // (IS1160-Blue and IS1160-Green can't both land in one box).
  const variantsByProduct = new Map<string, MysteryBoxSlot[]>();
  for (const slot of pool) {
    if (slot.available_quantity != null && slot.available_quantity < 1) continue;
    const arr = variantsByProduct.get(slot.productId);
    if (arr) arr.push(slot);
    else variantsByProduct.set(slot.productId, [slot]);
  }
  return variantsByProduct;
}

/** The dearest variant of each product, dearest product first. */
function dearestFirst(variantsByProduct: Map<string, MysteryBoxSlot[]>): MysteryBoxSlot[] {
  return [...variantsByProduct.values()]
    .map((variants) => variants.reduce((a, b) => (b.price_mur > a.price_mur ? b : a)))
    .sort((a, b) => b.price_mur - a.price_mur);
}

/**
 * Whether this pool can make a box: `count` distinct products that can reach
 * `minValue` together. Decides which sizes can be picked.
 */
export function canFillBox(
  pool: MysteryBoxSlot[],
  count: number = MYSTERY_BOX_SLOT_COUNT,
  minValue: number = MYSTERY_BOX_MIN_VALUE_MUR,
): boolean {
  const best = dearestFirst(groupByProduct(pool));
  return best.length >= count && sumBoxValue(best.slice(0, count)) >= minValue;
}

const MAX_RANDOM_TRIES = 60;

export function selectRandomBox(
  pool: MysteryBoxSlot[],
  count: number = MYSTERY_BOX_SLOT_COUNT,
  minValue: number = MYSTERY_BOX_MIN_VALUE_MUR,
  random: () => number = Math.random,
): MysteryBoxSlot[] {
  const variantsByProduct = groupByProduct(pool);
  const productIds = [...variantsByProduct.keys()];
  if (productIds.length < count) {
    throw new Error(
      `Not enough distinct products in pool: have ${productIds.length}, need ${count}`,
    );
  }
  if (!canFillBox(pool, count, minValue)) {
    throw new Error(`No box in this size reaches Rs ${minValue}`);
  }

  for (let attempt = 0; attempt < MAX_RANDOM_TRIES; attempt++) {
    for (let i = productIds.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [productIds[i], productIds[j]] = [productIds[j], productIds[i]];
    }
    const slots = productIds.slice(0, count).map((productId) => {
      const variants = variantsByProduct.get(productId)!;
      return variants[Math.floor(random() * variants.length)];
    });
    if (sumBoxValue(slots) >= minValue) return slots;
  }

  // Only a thin, cheap pool gets here: swap the cheapest picks of a random box
  // for the dearest pieces left until it reaches minValue. canFillBox above
  // guarantees the swaps get there.
  const slots = productIds.slice(0, count).map((id) => variantsByProduct.get(id)!.reduce((a, b) => (b.price_mur > a.price_mur ? b : a)));
  const spare = dearestFirst(variantsByProduct).filter((s) => !slots.some((p) => p.productId === s.productId));
  while (sumBoxValue(slots) < minValue && spare.length > 0) {
    let cheapest = 0;
    for (let i = 1; i < slots.length; i++) if (slots[i].price_mur < slots[cheapest].price_mur) cheapest = i;
    const next = spare.shift()!;
    if (next.price_mur <= slots[cheapest].price_mur) break;
    slots[cheapest] = next;
  }
  return slots;
}

export function generateBoxId(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6);
  return `MB-${y}-${m}-${d}-${rand}`;
}

export function sumBoxValue(slots: MysteryBoxSlot[]): number {
  return slots.reduce((acc, slot) => acc + slot.price_mur, 0);
}

export function countSelectableSlots(pool: MysteryBoxSlot[]): number {
  // Counts distinct parent products in the pool, since a box now allows at
  // most one variant per parent. The size is selectable when this >= 5.
  const productIds = new Set<string>();
  for (const slot of pool) {
    if (slot.available_quantity != null && slot.available_quantity < 1) continue;
    productIds.add(slot.productId);
  }
  return productIds.size;
}
