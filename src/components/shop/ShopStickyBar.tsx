"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ShopStickyBar({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const sort = params.get("sort") ?? "new";

  const cycle = () => {
    const order = ["new", "popular", "price-asc", "price-desc"];
    const i = order.indexOf(sort);
    const next = order[(i + 1) % order.length];
    const p = new URLSearchParams(params.toString());
    p.set("sort", next);
    router.push(`/shop?${p.toString()}`);
  };

  const labels: Record<string, string> = {
    new: "Newest",
    popular: "Popular",
    "price-asc": "Price ↑",
    "price-desc": "Price ↓",
  };

  return (
    <div className="sticky bottom-[64px] z-[10] flex gap-2 border-t border-blush-100 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
      <button
        onClick={onOpenFilters}
        className="flex-1 rounded-full border border-blush-400 bg-white py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
      >
        ⚙ Filters
      </button>
      <button
        onClick={cycle}
        className="flex-1 rounded-full bg-ink py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
      >
        Sort: {labels[sort] ?? "Newest"} ▾
      </button>
    </div>
  );
}
