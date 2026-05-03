"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { searchVariantsAction } from "../actions";
import type { VariantHit } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/format";

type Group = {
  productId: string;
  productTitle: string;
  productThumbnail: string | null;
  variants: VariantHit[];
};

function groupByProduct(hits: VariantHit[]): Group[] {
  const map = new Map<string, Group>();
  for (const h of hits) {
    let g = map.get(h.productId);
    if (!g) {
      g = {
        productId: h.productId,
        productTitle: h.productTitle,
        productThumbnail: h.productThumbnail,
        variants: [],
      };
      map.set(h.productId, g);
    }
    g.variants.push(h);
  }
  return [...map.values()];
}

function StockBadge({ hit }: { hit: VariantHit }) {
  if (!hit.manageInventory) {
    return (
      <span className="rounded-full bg-blush-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        Unmanaged
      </span>
    );
  }
  const qty = hit.inventoryQuantity ?? 0;
  if (qty <= 0) {
    return (
      <span className="rounded-full bg-coral-300/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-coral-700">
        Sold out
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blush-300/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink">
      {qty} in stock
    </span>
  );
}

export type SelectedVariant = {
  variantId: string;
  sku: string | null;
  variantTitle: string | null;
  productTitle: string;
  productThumbnail: string | null;
  priceMur: number | null;
};

export function StockChecker({
  onPickVariant,
}: {
  onPickVariant?: (v: SelectedVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [pending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    const reqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchVariantsAction(q, { availableOnly: false });
        if (reqId !== reqIdRef.current) return;
        setHits(res);
        setSearched(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const groups = useMemo(() => groupByProduct(hits), [hits]);

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Stock checker</h2>
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">
          all variants
        </span>
      </div>
      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU or product name…"
          autoFocus
          inputMode="search"
          className="w-full rounded-lg border-[1.5px] border-blush-400 bg-cream px-3 py-2.5 text-base text-ink outline-none focus:border-coral-500"
        />
        {pending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
            …
          </span>
        )}
      </div>
      {query.trim().length >= 2 && searched && groups.length === 0 && !pending && (
        <p className="mt-3 text-sm text-ink-muted">No matches for “{query}”.</p>
      )}
      {groups.length > 0 && (
        <ul className="mt-3 space-y-3">
          {groups.map((g) => (
            <li
              key={g.productId}
              className="rounded-xl border border-blush-300/60 bg-cream/60 p-3"
            >
              <div className="flex items-center gap-3">
                {g.productThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.productThumbnail}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-md bg-blush-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base text-ink">
                    {g.productTitle}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">
                    {g.variants.length} variant{g.variants.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-blush-300/40">
                {g.variants.map((v) => {
                  const inStock =
                    !v.manageInventory || (v.inventoryQuantity ?? 0) > 0;
                  return (
                    <li
                      key={v.variantId}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-semibold text-ink">
                          {v.variantTitle ?? "Default"}
                        </p>
                        <p className="font-mono text-[11px] text-ink-muted">
                          {v.sku ?? "—"}
                          {v.priceMur != null
                            ? ` · ${formatPrice(v.priceMur, "mur")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StockBadge hit={v} />
                        {onPickVariant && inStock && (
                          <button
                            type="button"
                            onClick={() =>
                              onPickVariant({
                                variantId: v.variantId,
                                sku: v.sku,
                                variantTitle: v.variantTitle,
                                productTitle: v.productTitle,
                                productThumbnail: v.productThumbnail,
                                priceMur: v.priceMur,
                              })
                            }
                            className="rounded-md border border-coral-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-coral-700 transition hover:bg-coral-500 hover:text-white"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
