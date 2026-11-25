// Lingerie product pages point shoppers to After Dark (Rahvi, 25 Nov 2026).
// Same handle rule as the /shop lingerie banner, but tolerant of case and a
// trailing slash, and the product may sit in other categories as well.
export function isLingerieProduct(
  categories: ReadonlyArray<{ handle?: string | null }> | null | undefined,
): boolean {
  return (categories ?? []).some(
    (c) => (c.handle ?? "").replace(/\/+$/, "").toLowerCase() === "lingerie",
  );
}
