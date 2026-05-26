import { getProductFacetIndex } from "@/lib/products";

// Per-product facet snapshot used by the client-side optimistic filter on
// /shop. Tiny payload (~50–80B per product, ~30–40KB gzipped for the whole
// catalog). The browser fetches this once, builds in-memory indexes, and
// can predict which products would match a facet selection without waiting
// for the SSR round-trip — the grid hides non-matching cards immediately
// and the real page renders behind it.
//
// Server cache (5 min via unstable_cache + PRODUCTS_CACHE_TAG) +
// public/CDN cache (60s s-maxage, 5 min SWR) keeps origin load near zero.
export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  const index = await getProductFacetIndex().catch((err) => {
    console.error("Shop facet index load failed:", err);
    return { entries: [], generatedAt: Date.now() };
  });
  return Response.json(index, {
    headers: {
      "cache-control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
