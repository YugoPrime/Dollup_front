"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function ShopSortDropdown() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("sort") ?? "new";

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = new URLSearchParams(params.toString());
    p.set("sort", e.target.value);
    router.push(`/shop?${p.toString()}`);
  };

  return (
    <label className="hidden items-center gap-2 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[12px] font-semibold text-ink md:flex">
      <span>Sort:</span>
      <select value={current} onChange={onChange} className="cursor-pointer bg-transparent outline-none">
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
