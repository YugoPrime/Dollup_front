"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductFacetIndex } from "@/lib/products";

// Wraps the SSR product grid with an optimistic client-side filter.
// When the shopper toggles a facet (size/color/price/on_sale) the SSR
// round-trip takes 200–800ms — feels laggy. This wrapper:
//
//   1. Fetches /shop/facets.json ONCE per session (cached server-side 5min,
//      CDN 60s). Payload is ~50B per product, ~30–40KB gzipped for 500
//      products — smaller than one product image.
//   2. Builds an in-memory `Map<productId, facets>` lookup.
//   3. On every URL change, computes the set of product IDs that match the
//      facet filters and applies `display:none` to non-matching cards
//      instantly — before the RSC payload returns.
//
// Server-rendered grid still owns category/q/sort/pagination — that's the
// expensive work. This only smooths the in-page facet toggles, which is
// where the perceived lag lives.
//
// SAFETY: if the snapshot doesn't yet contain a product id (rare race when
// the cache just rolled), we keep that card VISIBLE — better to show one
// stale card than to hide a match. Same when fetch fails: filter becomes
// a no-op and behavior collapses to the pre-existing SSR behavior.
export function OptimisticGrid({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const [index, setIndex] = useState<ProductFacetIndex | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/shop/facets.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProductFacetIndex | null) => {
        if (!cancelled && data) setIndex(data);
      })
      .catch(() => {
        /* network failure: optimistic filter disabled, SSR still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => {
    if (!index) return null;
    const m = new Map<string, ProductFacetIndex["entries"][number]>();
    for (const e of index.entries) m.set(e.id, e);
    return m;
  }, [index]);

  const filterFn = useMemo(() => {
    if (!byId) return null;
    const sizes = readMulti(params.get("size"));
    const colors = readMulti(params.get("color"));
    const onSale = params.get("on_sale") === "1";
    const priceMin = num(params.get("price_min"));
    const priceMax = num(params.get("price_max"));
    // Nothing to optimistically filter — let everything show.
    if (
      sizes.length === 0 &&
      colors.length === 0 &&
      !onSale &&
      priceMin == null &&
      priceMax == null
    ) {
      return null;
    }
    return (id: string): boolean => {
      const e = byId.get(id);
      if (!e) return true; // unknown id: show (safe default)
      if (sizes.length > 0 && !sizes.some((s) => e.sizes.includes(s))) return false;
      if (colors.length > 0 && !colors.some((c) => e.colors.includes(c))) return false;
      if (onSale && !e.onSale) return false;
      if (priceMin != null && e.price < priceMin) return false;
      if (priceMax != null && e.price > priceMax) return false;
      return true;
    };
  }, [byId, params]);

  // We don't manipulate children — each ProductCard ships inside its own
  // <OptimisticCardSlot> that reads this filterFn via context. Using context
  // keeps this component agnostic of the card markup so the SSR tree stays
  // untouched.
  return (
    <FilterContext.Provider value={filterFn}>
      {children}
    </FilterContext.Provider>
  );
}

function readMulti(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
function num(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// --- context plumbing for the per-card slot ---

type FilterFn = ((productId: string) => boolean) | null;
const FilterContext = createContext<FilterFn>(null);

export function OptimisticCardSlot({
  productId,
  children,
}: {
  productId: string;
  children: React.ReactNode;
}) {
  const filter = useContext(FilterContext);
  const hidden = filter ? !filter(productId) : false;
  // `display:none` (via `hidden` class) collapses the grid layout cleanly —
  // remaining cards re-flow into the gap as if the hidden one weren't there.
  // aria-hidden + tabindex prevent keyboard/screen-reader leakage.
  return (
    <div
      data-pid={productId}
      className={hidden ? "hidden" : ""}
      aria-hidden={hidden || undefined}
    >
      {children}
    </div>
  );
}
