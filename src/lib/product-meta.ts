import type { HttpTypes } from "@medusajs/types";

/**
 * Derives a customer-facing "product code" from variant SKUs (e.g. "IS1361-S"
 * + "IS1361-M" → "IS1361"). Falls back to the single variant SKU when there
 * is no common prefix to trim.
 */
export function extractProductCode(
  product: Pick<HttpTypes.StoreProduct, "variants">,
): string | null {
  const skus = (product.variants ?? [])
    .map((v) => (v.sku ?? "").trim())
    .filter((s): s is string => s.length > 0);

  if (skus.length === 0) return null;
  if (skus.length === 1) return skus[0];

  let prefix = skus[0];
  for (const sku of skus) {
    while (sku.indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return skus[0];
    }
  }
  const trimmed = prefix.replace(/[-_\s]+$/, "");
  return trimmed.length >= 3 ? trimmed : skus[0];
}

export type SizeAvailability = { value: string; available: boolean };

/**
 * For each size value on the product, decide whether at least one matching
 * variant is buyable (no inventory tracking or inventory_quantity > 0). Used
 * by the mobile quick-info pill row so customers see size availability above
 * the fold without scrolling to the buy box.
 */
export function getSizeAvailability(
  product: Pick<HttpTypes.StoreProduct, "options" | "variants">,
): { sizeOptionId: string | null; sizes: SizeAvailability[] } {
  const sizeOption = (product.options ?? []).find(
    (o) => (o.title ?? "").toLowerCase() === "size",
  );
  if (!sizeOption) return { sizeOptionId: null, sizes: [] };

  const sizeValues = ((sizeOption.values ?? [])
    .map((v) => v.value)
    .filter(Boolean) as string[]);

  // Hide fully sold-out sizes from the quick-info pill row — we want the
  // customer to only see sizes they can actually buy.
  const sizes: SizeAvailability[] = sizeValues
    .map((value) => {
      const available = (product.variants ?? []).some((variant) => {
        const opts = variant.options ?? [];
        const hasSize = opts.some(
          (o) => o.option_id === sizeOption.id && o.value === value,
        );
        if (!hasSize) return false;
        return !variant.manage_inventory || (variant.inventory_quantity ?? 0) > 0;
      });
      return { value, available };
    })
    .filter((s) => s.available);

  return { sizeOptionId: sizeOption.id, sizes };
}
