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

export function selectRandomBox(
  pool: MysteryBoxSlot[],
  count: number = MYSTERY_BOX_SLOT_COUNT,
): MysteryBoxSlot[] {
  // Group eligible variants by parent productId — a box must contain `count`
  // distinct parents (no two variants of the same product, e.g. IS1160-Blue
  // and IS1160-Green can't both land in the same box).
  const variantsByProduct = new Map<string, MysteryBoxSlot[]>();
  for (const slot of pool) {
    const arr = variantsByProduct.get(slot.productId);
    if (arr) arr.push(slot);
    else variantsByProduct.set(slot.productId, [slot]);
  }

  const productIds = [...variantsByProduct.keys()];
  if (productIds.length < count) {
    throw new Error(
      `Not enough distinct products in pool: have ${productIds.length}, need ${count}`,
    );
  }

  for (let i = productIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [productIds[i], productIds[j]] = [productIds[j], productIds[i]];
  }

  return productIds.slice(0, count).map((productId) => {
    const variants = variantsByProduct.get(productId)!;
    return variants[Math.floor(Math.random() * variants.length)];
  });
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
