"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = [
  { value: "coral", hex: "#E5604A" },
  { value: "black", hex: "#1c1010" },
  { value: "blush", hex: "#F2DDD8" },
  { value: "white", hex: "#FFFFFF" },
  { value: "green", hex: "#3a5a40" },
  { value: "blue", hex: "#85C1E9" },
  { value: "yellow", hex: "#F4D03F" },
];

export function ShopFilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  if (!open) return null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  };
  const has = (key: string, val: string) => params.get(key) === val;

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

        <FilterGroup label="Size">
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => (
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

        <FilterGroup label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setParam("color", has("color", c.value) ? null : c.value)}
                aria-label={c.value}
                className={`h-7 w-7 rounded-full border-2 border-white ${
                  has("color", c.value) ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Price (Rs)">
          <p className="font-sans text-[12px] text-ink-muted">Range filter — wired up later when we have a price slider component.</p>
        </FilterGroup>
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
