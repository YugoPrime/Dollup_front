"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = ["dresses", "lingerie", "beachwear", "accessories"];

export function ShopFilterChips({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();

  const activeCategory = params.get("category");
  const sort = params.get("sort") ?? "new";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  };

  return (
    <div className="sticky top-0 z-[5] flex gap-2 overflow-x-auto border-b border-blush-100 bg-white px-4 py-2.5 md:hidden">
      <button
        onClick={onOpenFilters}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-blush-300 bg-blush-100 px-3.5 py-2 font-sans text-[11px] font-semibold text-ink"
      >
        ⚙ Filters
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => setParam("category", activeCategory === c ? null : c)}
          className={`shrink-0 rounded-full border px-3.5 py-2 font-sans text-[11px] font-semibold capitalize ${
            activeCategory === c
              ? "border-ink bg-ink text-white"
              : "border-blush-400 bg-white text-ink"
          }`}
        >
          {c}
          {activeCategory === c && <span className="ml-1 opacity-60">×</span>}
        </button>
      ))}
      <button
        onClick={() => setParam("sort", sort === "new" ? "popular" : "new")}
        className="shrink-0 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[11px] font-semibold text-ink"
      >
        Sort: {sort === "new" ? "Newest" : "Popular"} ▾
      </button>
    </div>
  );
}
