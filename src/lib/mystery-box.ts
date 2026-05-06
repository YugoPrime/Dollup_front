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
  const expandedPool = pool.flatMap((slot) => {
    const maxUses = Math.min(slot.available_quantity ?? count, count);
    return Array.from({ length: Math.max(0, maxUses) }, () => slot);
  });

  if (expandedPool.length < count) {
    throw new Error(
      `Not enough products in pool: have ${expandedPool.length}, need ${count}`,
    );
  }

  const copy = [...expandedPool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, count);
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
  return pool.reduce((sum, slot) => {
    const maxUses = Math.min(
      slot.available_quantity ?? MYSTERY_BOX_SLOT_COUNT,
      MYSTERY_BOX_SLOT_COUNT,
    );
    return sum + Math.max(0, maxUses);
  }, 0);
}
