import type { HttpTypes } from "@medusajs/types";

// Category handle of the 18+ "Intimates" bucket in Medusa.
export const INTIMATES_CATEGORY_HANDLE = "intimates";

// Cookie set by /private/[token] after a successful unlock. Lasts 30 days.
export const PRIVATE_UNLOCK_COOKIE = "dub_private_unlock";

type ProductCategoriesLike = {
  metadata?: unknown;
  categories?: Array<{ handle?: string | null }> | null;
};

function getMetadata(product: ProductCategoriesLike): Record<string, unknown> {
  const meta = product.metadata;
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
}

export function isInIntimatesCategory(product: ProductCategoriesLike): boolean {
  const cats = product.categories ?? [];
  return cats.some(
    (c) => (c?.handle ?? "").toLowerCase() === INTIMATES_CATEGORY_HANDLE,
  );
}

/**
 * 18+ age-gate + noindex applies when in the Intimates category, or when the
 * product has been explicitly stamped `metadata.age_restricted: true`.
 */
export function isAgeRestricted(product: ProductCategoriesLike): boolean {
  if (isInIntimatesCategory(product)) return true;
  const meta = getMetadata(product);
  return meta.age_restricted === true;
}

/**
 * Per-product flag stamped via Medusa admin (metadata.unlisted = true).
 * Hides the product from /shop, search, sitemap, related, mystery box,
 * story planner — but the direct /products/[handle] URL still resolves.
 */
export function isUnlisted(product: ProductCategoriesLike): boolean {
  const meta = getMetadata(product);
  return meta.unlisted === true;
}

/**
 * Returns true if the product should appear in public listings.
 *
 * The rule is intentionally simple: `metadata.unlisted = true` is the ONLY
 * thing that hides a product from public surfaces (unless the visitor has
 * the private-unlock cookie).
 *
 * Intimates products are publicly listed by default — the 18+ age gate on
 * the PDP plus the noindex meta tag handle the "adult" concern without
 * needing to hide the inventory itself. Surfaces that should still strip
 * Intimates (sitemap, related-products rail, story planner, mystery box)
 * pass `excludeIntimates: true` explicitly.
 */
export function isPubliclyListed(
  product: ProductCategoriesLike,
  opts: { unlocked: boolean; excludeIntimates?: boolean } = { unlocked: false },
): boolean {
  if (isUnlisted(product) && !opts.unlocked) return false;
  if (opts.excludeIntimates && isInIntimatesCategory(product) && !opts.unlocked) {
    return false;
  }
  return true;
}

export function filterPublic<T extends ProductCategoriesLike>(
  products: T[],
  opts: { unlocked: boolean; excludeIntimates?: boolean },
): T[] {
  return products.filter((p) => isPubliclyListed(p, opts));
}

export function isPubliclyListedStoreProduct(
  product: HttpTypes.StoreProduct,
  opts: { unlocked: boolean; excludeIntimates?: boolean } = { unlocked: false },
): boolean {
  return isPubliclyListed(product as unknown as ProductCategoriesLike, opts);
}
