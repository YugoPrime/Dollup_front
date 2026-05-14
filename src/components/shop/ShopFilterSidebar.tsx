"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type RawCategory = { id: string; name: string; handle: string; parent_category_id: string | null };

type Facets = {
  sizes: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
};

// Hidden top-level slugs we never want in the shop sidebar (admin handles
// the toy line separately, and "uncategorized"/"women" are wrappers).
const HIDDEN_HANDLES = new Set(["toys", "uncategorized", "women"]);

// Hex per canonical color bucket (matches canonicalColor() in lib/products.ts).
// "multi" gets a conic gradient because it represents prints/multi-color items.
const COLOR_HEX: Record<string, string> = {
  black: "#1c1010",
  white: "#ffffff",
  cream: "#FAF6F4",
  red: "#B8412C",
  burgundy: "#5C1F2A",
  pink: "#F8C4D4",
  blush: "#F2DDD8",
  nude: "#E8C9B0",
  brown: "#5e4030",
  grey: "#8a7773",
  blue: "#6FA8DC",
  navy: "#1F2A44",
  green: "#3a5a40",
  yellow: "#F4D03F",
  orange: "#F39C5B",
  coral: "#E5604A",
  purple: "#7E5A9B",
  multi: "conic-gradient(from 0deg,#E5604A,#F4D03F,#3a5a40,#6FA8DC,#7E5A9B,#E5604A)",
};

export function ShopFilterSidebar({
  categories,
  stockedHandles,
  facets,
}: {
  categories: RawCategory[];
  // Category handles that currently have at least one in-stock product. Empty
  // array (or undefined) ⇒ filter disabled (e.g. upstream fetch failed) so we
  // show everything rather than blanking the tree.
  stockedHandles?: string[];
  facets: Facets;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const has = (key: string, val: string) => params.get(key) === val;
  const setParam = (key: string, val: string | null, pendingId?: string) => {
    setPendingKey(pendingId ?? key);
    const next = new URLSearchParams(params.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };
  const clearAll = () => {
    setPendingKey("clear-all");
    startTransition(() => {
      router.push("/shop");
    });
  };
  const showSpinner = (id: string) => isPending && pendingKey === id;

  // Build a top-level + subcategory tree. "Women" is treated as a wrapper:
  // its children get elevated to top-level (Clothing, Accessories, Beachwear).
  // Any OTHER top-level categories (Intimates, etc.) are kept alongside them
  // — without this they'd be invisible whenever "Women" has children.
  //
  // Empty `stockedHandles` ⇒ skip the in-stock filter so we don't blank the
  // tree when upstream stock data is unavailable.
  const visible = useMemo(() => {
    const stocked = new Set(stockedHandles ?? []);
    const stockFilterActive = stocked.size > 0;
    const inStock = (handle: string) =>
      !stockFilterActive || stocked.has(handle);

    const tree: { root: RawCategory; children: RawCategory[] }[] = [];
    const childrenByParent = new Map<string | null, RawCategory[]>();
    for (const c of categories) {
      const p = c.parent_category_id;
      const arr = childrenByParent.get(p) ?? [];
      arr.push(c);
      childrenByParent.set(p, arr);
    }

    const women = categories.find((c) => c.handle === "women");
    const womenChildren = women
      ? categories.filter((c) => c.parent_category_id === women.id)
      : [];
    const otherTopLevel = categories.filter(
      (c) => !c.parent_category_id && c.id !== women?.id,
    );
    const topLevel = [...womenChildren, ...otherTopLevel]
      .filter((c) => !HIDDEN_HANDLES.has(c.handle))
      .filter((c) => inStock(c.handle))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const root of topLevel) {
      const kids = (childrenByParent.get(root.id) ?? [])
        .filter((c) => inStock(c.handle))
        .sort((a, b) => a.name.localeCompare(b.name));
      tree.push({ root, children: kids });
    }
    return tree;
  }, [categories, stockedHandles]);

  const activeCategory = params.get("category") ?? "";

  // Local price range state synced to URL via debounced commit on slider release.
  const initialMin = Number(params.get("price_min") ?? facets.priceMin) || facets.priceMin;
  const initialMax = Number(params.get("price_max") ?? facets.priceMax) || facets.priceMax;
  const [pMin, setPMin] = useState<number>(initialMin);
  const [pMax, setPMax] = useState<number>(initialMax);
  // Reset local state if the user clears or changes the URL externally.
  useEffect(() => {
    setPMin(Number(params.get("price_min") ?? facets.priceMin) || facets.priceMin);
    setPMax(Number(params.get("price_max") ?? facets.priceMax) || facets.priceMax);
  }, [params, facets.priceMin, facets.priceMax]);

  const commitPrice = () => {
    setPendingKey("price");
    const next = new URLSearchParams(params.toString());
    if (pMin > facets.priceMin) next.set("price_min", String(pMin));
    else next.delete("price_min");
    if (pMax < facets.priceMax) next.set("price_max", String(pMax));
    else next.delete("price_max");
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };

  return (
    <aside className="hidden w-full self-start md:sticky md:top-6 md:block md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:rounded-2xl md:border md:border-blush-100 md:bg-white md:p-4 md:shadow-[0_1px_4px_rgba(229,96,74,0.04)]">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[18px] leading-none text-ink">Filters</h3>
        <button
          onClick={clearAll}
          disabled={isPending}
          className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700 disabled:opacity-70"
        >
          {showSpinner("clear-all") && (
            <Spinner className="h-3.5 w-3.5 text-coral-500" />
          )}
          Clear all
        </button>
      </header>

      <Group label="Offers">
        <label className="flex cursor-pointer items-center gap-2 py-1.5 font-sans text-[13px] text-ink">
          <input
            type="checkbox"
            checked={has("on_sale", "1")}
            disabled={isPending}
            onChange={() => setParam("on_sale", has("on_sale", "1") ? null : "1", "on_sale")}
            className="accent-coral-500"
          />
          On sale
          {showSpinner("on_sale") && (
            <Spinner className="h-3.5 w-3.5 text-coral-500" />
          )}
        </label>
      </Group>

      <Group label="Category">
        <div className="space-y-2">
          {visible.map(({ root, children }) => (
            <div key={root.handle}>
              <button
                onClick={() =>
                  setParam(
                    "category",
                    activeCategory === root.handle ? null : root.handle,
                    `cat:${root.handle}`,
                  )
                }
                disabled={isPending}
                className={`flex w-full items-center justify-between text-left font-sans text-[13px] font-medium transition-colors hover:text-coral-500 ${
                  activeCategory === root.handle ? "text-coral-500" : "text-ink"
                }`}
              >
                <span>{root.name}</span>
                {showSpinner(`cat:${root.handle}`) && (
                  <Spinner className="h-3.5 w-3.5 text-coral-500" />
                )}
              </button>
              {children.length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-blush-100 pl-2.5">
                  {children.map((c) => (
                    <button
                      key={c.handle}
                      onClick={() =>
                        setParam(
                          "category",
                          activeCategory === c.handle ? null : c.handle,
                          `cat:${c.handle}`,
                        )
                      }
                      disabled={isPending}
                      className={`flex w-full items-center justify-between text-left font-sans text-[12px] transition-colors hover:text-coral-500 ${
                        activeCategory === c.handle ? "font-semibold text-coral-500" : "text-ink-soft"
                      }`}
                    >
                      <span>{c.name}</span>
                      {showSpinner(`cat:${c.handle}`) && (
                        <Spinner className="h-3 w-3 text-coral-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Group>

      {facets.sizes.length > 0 && (
        <Group label="Size">
          <div className="grid grid-cols-4 gap-1.5">
            {facets.sizes.map((s) => {
              const active = has("size", s);
              const loading = showSpinner(`size:${s}`);
              return (
                <button
                  key={s}
                  onClick={() => setParam("size", active ? null : s, `size:${s}`)}
                  disabled={isPending}
                  aria-pressed={active}
                  className={`flex min-h-8 items-center justify-center rounded-md border py-1.5 font-sans text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-ink bg-ink text-white"
                      : "border-blush-400 bg-white text-ink hover:border-coral-500 hover:text-coral-500"
                  } ${isPending && !loading ? "opacity-80" : ""}`}
                >
                  {loading ? (
                    <Spinner
                      className={`h-3.5 w-3.5 ${active ? "text-white" : "text-ink"}`}
                    />
                  ) : (
                    s
                  )}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group label="Color">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const hex = COLOR_HEX[c] ?? "#8a7773";
              const active = has("color", c);
              const loading = showSpinner(`color:${c}`);
              const light = ["white", "cream", "blush", "nude", "yellow", "pink"].includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setParam("color", active ? null : c, `color:${c}`)}
                  disabled={isPending}
                  aria-label={c}
                  aria-pressed={active}
                  title={c}
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white transition ${
                    active || loading
                      ? "ring-2 ring-coral-500"
                      : "ring-1 ring-blush-400 hover:ring-coral-500"
                  } ${isPending && !loading ? "opacity-80" : ""}`}
                  style={{ background: hex }}
                >
                  {loading && (
                    <>
                      <span
                        className={`absolute inset-0 rounded-full ${
                          light ? "bg-ink/10" : "bg-white/25"
                        }`}
                        aria-hidden
                      />
                      <Spinner
                        className={`relative h-3.5 w-3.5 ${light ? "text-ink" : "text-white"}`}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {facets.priceMax > facets.priceMin && (
        <Group label="Price">
          <div className="mb-2 flex items-center justify-between font-sans text-[12px] font-semibold text-ink">
            <span>Rs {pMin}</span>
            <span>Rs {pMax}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={facets.priceMin}
              max={facets.priceMax}
              value={pMin}
              onChange={(e) => setPMin(Math.min(Number(e.target.value) || 0, pMax))}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === "Enter" && commitPrice()}
              aria-label="Minimum price"
              className="w-full rounded-md border border-blush-300 bg-white px-2 py-1.5 font-sans text-[12px] text-ink outline-none focus:border-coral-500"
            />
            <span className="font-sans text-[11px] text-ink-muted">—</span>
            <input
              type="number"
              min={facets.priceMin}
              max={facets.priceMax}
              value={pMax}
              onChange={(e) => setPMax(Math.max(Number(e.target.value) || 0, pMin))}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === "Enter" && commitPrice()}
              aria-label="Maximum price"
              className="w-full rounded-md border border-blush-300 bg-white px-2 py-1.5 font-sans text-[12px] text-ink outline-none focus:border-coral-500"
            />
          </div>
        </Group>
      )}
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 border-b border-blush-100 pb-4 last:mb-0 last:border-0 last:pb-0">
      <h4 className="mb-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">{label}</h4>
      {children}
    </section>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
