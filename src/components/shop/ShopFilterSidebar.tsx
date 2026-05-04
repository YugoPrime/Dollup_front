"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

// Best-effort hex map for known color names; unknown colors fall back to grey.
const COLOR_HEX: Record<string, string> = {
  black: "#1c1010", white: "#ffffff", coral: "#E5604A", blush: "#F2DDD8",
  cream: "#FAF6F4", nude: "#F2DDD8", pink: "#F8D5CD", red: "#B8412C",
  green: "#3a5a40", blue: "#85C1E9", yellow: "#F4D03F", grey: "#8a7773",
  gray: "#8a7773", brown: "#5e4030", purple: "#7E5A9B", orange: "#F39C5B",
  burgandy: "#5C1F2A", burgundy: "#5C1F2A", navy: "#1F2A44",
};

export function ShopFilterSidebar({
  categories,
  facets,
}: {
  categories: RawCategory[];
  facets: Facets;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const has = (key: string, val: string) => params.get(key) === val;
  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    next.delete("page");
    router.push(`/shop?${next.toString()}`);
  };
  const clearAll = () => router.push("/shop");

  // Build a top-level + subcategory tree (excluding hidden roots and the
  // wrapper "Women" parent that holds everything).
  const visible = useMemo(() => {
    const womenId = categories.find((c) => c.handle === "women")?.id;
    void womenId; // not used directly; we filter by handle membership instead
    const tree: { root: RawCategory; children: RawCategory[] }[] = [];
    const childrenByParent = new Map<string | null, RawCategory[]>();
    for (const c of categories) {
      const p = c.parent_category_id;
      const arr = childrenByParent.get(p) ?? [];
      arr.push(c);
      childrenByParent.set(p, arr);
    }
    // Roots: parent_category_id is the "Women" id OR null. We elevate the children
    // of "Women" to top-level (Accessories, Beachwear, Clothing).
    const womenChildren = categories.filter((c) => {
      const parent = categories.find((p) => p.handle === "women");
      return parent != null && c.parent_category_id === parent.id;
    });
    const topLevel = (womenChildren.length ? womenChildren : categories.filter((c) => !c.parent_category_id))
      .filter((c) => !HIDDEN_HANDLES.has(c.handle))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const root of topLevel) {
      const kids = childrenByParent.get(root.id) ?? [];
      tree.push({ root, children: kids.sort((a, b) => a.name.localeCompare(b.name)) });
    }
    return tree;
  }, [categories]);

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
    const next = new URLSearchParams(params.toString());
    if (pMin > facets.priceMin) next.set("price_min", String(pMin));
    else next.delete("price_min");
    if (pMax < facets.priceMax) next.set("price_max", String(pMax));
    else next.delete("price_max");
    next.delete("page");
    router.push(`/shop?${next.toString()}`);
  };

  return (
    <aside className="hidden w-full self-start md:sticky md:top-6 md:block md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:rounded-2xl md:border md:border-blush-100 md:bg-white md:p-4 md:shadow-[0_1px_4px_rgba(229,96,74,0.04)]">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[18px] leading-none text-ink">Filters</h3>
        <button
          onClick={clearAll}
          className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 hover:text-coral-700"
        >
          Clear all
        </button>
      </header>

      <Group label="Offers">
        <label className="flex cursor-pointer items-center gap-2 py-1.5 font-sans text-[13px] text-ink">
          <input
            type="checkbox"
            checked={has("on_sale", "1")}
            onChange={() => setParam("on_sale", has("on_sale", "1") ? null : "1")}
            className="accent-coral-500"
          />
          On sale
        </label>
      </Group>

      <Group label="Category">
        <div className="space-y-2">
          {visible.map(({ root, children }) => (
            <div key={root.handle}>
              <button
                onClick={() => setParam("category", activeCategory === root.handle ? null : root.handle)}
                className={`block w-full text-left font-sans text-[13px] font-medium transition-colors hover:text-coral-500 ${
                  activeCategory === root.handle ? "text-coral-500" : "text-ink"
                }`}
              >
                {root.name}
              </button>
              {children.length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-blush-100 pl-2.5">
                  {children.map((c) => (
                    <button
                      key={c.handle}
                      onClick={() => setParam("category", activeCategory === c.handle ? null : c.handle)}
                      className={`block w-full text-left font-sans text-[12px] transition-colors hover:text-coral-500 ${
                        activeCategory === c.handle ? "font-semibold text-coral-500" : "text-ink-soft"
                      }`}
                    >
                      {c.name}
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
            {facets.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setParam("size", has("size", s) ? null : s)}
                className={`rounded-md border py-1.5 font-sans text-[11px] font-semibold transition-colors ${
                  has("size", s)
                    ? "border-ink bg-ink text-white"
                    : "border-blush-400 bg-white text-ink hover:border-coral-500 hover:text-coral-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group label="Color">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const hex = COLOR_HEX[c] ?? "#8a7773";
              const active = has("color", c);
              return (
                <button
                  key={c}
                  onClick={() => setParam("color", active ? null : c)}
                  aria-label={c}
                  title={c}
                  className={`h-7 w-7 rounded-full border-2 border-white transition ${
                    active ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400 hover:ring-coral-500"
                  }`}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
        </Group>
      )}

      {facets.priceMax > facets.priceMin && (
        <Group label="Price">
          <div className="flex items-center justify-between font-sans text-[12px] font-semibold text-ink">
            <span>Rs {pMin}</span>
            <span>Rs {pMax}</span>
          </div>
          <div className="mt-2 space-y-2">
            <input
              type="range"
              min={facets.priceMin}
              max={facets.priceMax}
              step={50}
              value={pMin}
              onChange={(e) => setPMin(Math.min(Number(e.target.value), pMax))}
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              className="w-full accent-coral-500"
            />
            <input
              type="range"
              min={facets.priceMin}
              max={facets.priceMax}
              step={50}
              value={pMax}
              onChange={(e) => setPMax(Math.max(Number(e.target.value), pMin))}
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              className="w-full accent-coral-500"
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
