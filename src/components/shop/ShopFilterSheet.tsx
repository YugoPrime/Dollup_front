"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type SheetCategory = { id: string; name: string; handle: string; parent_category_id: string | null };
export type SheetFacets = { sizes: string[]; colors: string[]; priceMin: number; priceMax: number };

const HIDDEN_HANDLES = new Set(["toys", "uncategorized", "women"]);
const COLOR_HEX: Record<string, string> = {
  black: "#1c1010", white: "#ffffff", coral: "#E5604A", blush: "#F2DDD8",
  cream: "#FAF6F4", nude: "#F2DDD8", pink: "#F8D5CD", red: "#B8412C",
  green: "#3a5a40", blue: "#85C1E9", yellow: "#F4D03F", grey: "#8a7773",
  gray: "#8a7773", brown: "#5e4030", purple: "#7E5A9B", orange: "#F39C5B",
  burgandy: "#5C1F2A", burgundy: "#5C1F2A", navy: "#1F2A44",
};

export function ShopFilterSheet({
  open,
  onClose,
  categories,
  facets,
}: {
  open: boolean;
  onClose: () => void;
  categories: SheetCategory[];
  facets: SheetFacets;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/shop?${next.toString()}`);
  };
  const has = (key: string, val: string) => params.get(key) === val;
  const activeCategory = params.get("category") ?? "";

  const visible = useMemo(() => {
    const womenParent = categories.find((c) => c.handle === "women");
    const womenChildren = womenParent
      ? categories.filter((c) => c.parent_category_id === womenParent.id)
      : categories.filter((c) => !c.parent_category_id);
    const childrenByParent = new Map<string | null, SheetCategory[]>();
    for (const c of categories) {
      const p = c.parent_category_id;
      const arr = childrenByParent.get(p) ?? [];
      arr.push(c);
      childrenByParent.set(p, arr);
    }
    return womenChildren
      .filter((c) => !HIDDEN_HANDLES.has(c.handle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((root) => ({
        root,
        children: (childrenByParent.get(root.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [categories]);

  const initialMin = Number(params.get("price_min") ?? facets.priceMin) || facets.priceMin;
  const initialMax = Number(params.get("price_max") ?? facets.priceMax) || facets.priceMax;
  const [pMin, setPMin] = useState<number>(initialMin);
  const [pMax, setPMax] = useState<number>(initialMax);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-label="Filters">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[20px] text-ink">Filters</h3>
          <button onClick={onClose} className="font-sans text-[11px] font-semibold uppercase tracking-wider text-coral-500">
            Done
          </button>
        </div>

        <FilterGroup label="Offers">
          <label className="flex cursor-pointer items-center gap-2 font-sans text-[13px] text-ink">
            <input
              type="checkbox"
              checked={has("on_sale", "1")}
              onChange={() => setParam("on_sale", has("on_sale", "1") ? null : "1")}
              className="accent-coral-500"
            />
            On sale
          </label>
        </FilterGroup>

        <FilterGroup label="Category">
          <div className="space-y-2">
            {visible.map(({ root, children }) => (
              <div key={root.handle}>
                <button
                  onClick={() => setParam("category", activeCategory === root.handle ? null : root.handle)}
                  className={`block w-full text-left font-sans text-[14px] font-medium transition-colors ${
                    activeCategory === root.handle ? "text-coral-500" : "text-ink"
                  }`}
                >
                  {root.name}
                </button>
                {children.length > 0 && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-blush-100 pl-2.5">
                    {children.map((c) => (
                      <button
                        key={c.handle}
                        onClick={() => setParam("category", activeCategory === c.handle ? null : c.handle)}
                        className={`block w-full text-left font-sans text-[12px] ${
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
        </FilterGroup>

        {facets.sizes.length > 0 && (
          <FilterGroup label="Size">
            <div className="grid grid-cols-4 gap-1.5">
              {facets.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setParam("size", has("size", s) ? null : s)}
                  className={`rounded-md border py-2 font-sans text-[11px] font-semibold ${
                    has("size", s) ? "border-ink bg-ink text-white" : "border-blush-400 bg-white text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterGroup>
        )}

        {facets.colors.length > 0 && (
          <FilterGroup label="Color">
            <div className="flex flex-wrap gap-2">
              {facets.colors.map((c) => {
                const hex = COLOR_HEX[c] ?? "#8a7773";
                return (
                  <button
                    key={c}
                    onClick={() => setParam("color", has("color", c) ? null : c)}
                    aria-label={c}
                    className={`h-7 w-7 rounded-full border-2 border-white ${
                      has("color", c) ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
                    }`}
                    style={{ background: hex }}
                  />
                );
              })}
            </div>
          </FilterGroup>
        )}

        {facets.priceMax > facets.priceMin && (
          <FilterGroup label="Price (Rs)">
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
          </FilterGroup>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 border-b border-blush-100 pb-5 last:border-0">
      <h4 className="mb-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">{label}</h4>
      {children}
    </section>
  );
}
