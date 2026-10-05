// Pure ordering helpers for product listings. Kept free of Medusa calls so
// they can be unit-tested; `listWithFacetFilters` applies them before the
// pagination slice.

type WithCategories = {
  categories?: { id?: string | null }[] | null;
};

/**
 * Stable partition: every product that belongs to one of `categoryIds` is
 * moved after every product that does not, with relative order preserved on
 * both sides. Used so the unfiltered /shop grid leads with the fashion
 * catalogue and lists After Dark items last instead of first just because
 * they were imported most recently.
 */
export function deprioritizeCategories<T extends WithCategories>(
  products: T[],
  categoryIds: Iterable<string>,
): T[] {
  const ids = new Set(categoryIds);
  if (ids.size === 0) return products;
  const head: T[] = [];
  const tail: T[] = [];
  for (const p of products) {
    const inCat = (p.categories ?? []).some((c) => !!c.id && ids.has(c.id));
    (inCat ? tail : head).push(p);
  }
  return tail.length === 0 ? products : [...head, ...tail];
}
