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
 * - Unlisted items: hidden unless caller is unlocked.
 * - Intimates-category items: hidden from generic listings unless
 *   `includeIntimates` is set (used by /private and category-targeted pages).
 */
export function isPubliclyListed(
  product: ProductCategoriesLike,
  opts: { unlocked: boolean; includeIntimates?: boolean } = { unlocked: false },
): boolean {
  if (isUnlisted(product) && !opts.unlocked) return false;
  if (
    isInIntimatesCategory(product) &&
    !opts.includeIntimates &&
    !opts.unlocked
  ) {
    return false;
  }
  return true;
}

export function filterPublic<T extends ProductCategoriesLike>(
  products: T[],
  opts: { unlocked: boolean; includeIntimates?: boolean },
): T[] {
  return products.filter((p) => isPubliclyListed(p, opts));
}

export function isPubliclyListedStoreProduct(
  product: HttpTypes.StoreProduct,
  opts: { unlocked: boolean; includeIntimates?: boolean } = { unlocked: false },
): boolean {
  return isPubliclyListed(product as unknown as ProductCategoriesLike, opts);
}
