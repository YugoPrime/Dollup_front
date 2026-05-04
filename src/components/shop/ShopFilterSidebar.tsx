"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { slug: "dresses", label: "Dresses" },
  { slug: "lingerie", label: "Lingerie" },
  { slug: "beachwear", label: "Beachwear" },
  { slug: "accessories", label: "Accessories" },
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = [
  { value: "coral", hex: "#E5604A" },
  { value: "black", hex: "#1c1010" },
  { value: "blush", hex: "#F2DDD8" },
  { value: "white", hex: "#FFFFFF" },
  { value: "grey", hex: "#8a7773" },
  { value: "green", hex: "#3a5a40" },
];

export function ShopFilterSidebar() {
  const router = useRouter();
  const params = useSearchParams();

  const has = (key: string, val: string) => params.get(key) === val;
  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    router.push(`/shop?${next.toString()}`);
  };
  const clearAll = () => router.push("/shop");

  return (
    <aside className="hidden w-[230px] shrink-0 rounded-2xl border border-blush-100 bg-white p-4 shadow-[0_1px_4px_rgba(229,96,74,0.04)] md:block">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[18px] leading-none text-ink">Filters</h3>
        <button onClick={clearAll} className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500">
          Clear all
        </button>
      </header>

      <Group label="Category">
        {CATEGORIES.map((c) => (
          <label key={c.slug} className="flex cursor-pointer items-center gap-2 py-1.5 font-sans text-[13px] text-ink">
            <input
              type="checkbox"
              checked={has("category", c.slug)}
              onChange={() => setParam("category", has("category", c.slug) ? null : c.slug)}
              className="accent-coral-500"
            />
            {c.label}
          </label>
        ))}
      </Group>

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

      <Group label="Size">
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setParam("size", has("size", s) ? null : s)}
              className={`rounded-md border py-1.5 font-sans text-[11px] font-semibold ${
                has("size", s) ? "border-ink bg-ink text-white" : "border-blush-400 bg-white text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setParam("color", has("color", c.value) ? null : c.value)}
              aria-label={c.value}
              className={`h-6 w-6 rounded-full border-2 border-white ${
                has("color", c.value) ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
              }`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </Group>
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
