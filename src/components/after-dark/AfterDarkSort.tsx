"use client";

import { useRouter } from "next/navigation";
import { AFTER_DARK_PATH } from "@/lib/after-dark";
import type { AfterDarkSortKey } from "./AfterDarkChips";

const OPTIONS: ReadonlyArray<{ value: AfterDarkSortKey; label: string }> = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

// Same pill as the shop's sort, shown on every width. Keeps `group` and `q`.
export function AfterDarkSort({ value }: { value: AfterDarkSortKey }) {
  const router = useRouter();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = new URLSearchParams(window.location.search);
    if (e.target.value === "new") p.delete("sort");
    else p.set("sort", e.target.value);
    const qs = p.toString();
    router.push(qs ? `${AFTER_DARK_PATH}?${qs}` : AFTER_DARK_PATH, { scroll: false });
  };

  return (
    <label className="flex items-center gap-2 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[12px] font-semibold text-ink focus-within:border-wine-800 focus-within:ring-2 focus-within:ring-wine-800/20">
      <span>Sort:</span>
      {/* Remounts when the server sends the new sort, so the select never
          snaps back to the old value while the page loads. */}
      <select
        key={value}
        aria-label="Sort After Dark"
        defaultValue={value}
        onChange={onChange}
        className="cursor-pointer bg-transparent outline-none focus:ring-0"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
