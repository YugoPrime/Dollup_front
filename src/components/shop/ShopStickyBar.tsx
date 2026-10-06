"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function ShopStickyBar({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const sort = params.get("sort") ?? "new";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Only float while the product grid is on screen. Past the grid (footer,
  // newsletter) the bar was stacking on the tab bar for no reason.
  const [gridVisible, setGridVisible] = useState(true);

  useEffect(() => {
    const grid = document.getElementById("shop-grid");
    if (!grid || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setGridVisible(entry.isIntersecting);
        if (!entry.isIntersecting) setOpen(false);
      },
      // Treat the grid as "gone" once its bottom edge passes the bar.
      { rootMargin: "0px 0px -120px 0px", threshold: 0 },
    );
    io.observe(grid);
    return () => io.disconnect();
  }, []);

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Newest";

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (value: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("sort", value);
    p.delete("page");
    router.push(`/shop?${p.toString()}`);
    setOpen(false);
  };

  return (
    <div
      inert={!gridVisible || undefined}
      className={`fixed inset-x-0 bottom-[64px] z-[40] flex gap-2 border-t border-blush-100 bg-white/95 px-4 py-2.5 backdrop-blur transition-transform duration-200 md:hidden ${
        gridVisible ? "translate-y-0" : "translate-y-[140%]"
      }`}
    >
      <button
        onClick={onOpenFilters}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-blush-400 bg-white py-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-ink active:scale-[0.98]"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters
      </button>
      <div ref={ref} className="relative flex-1">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink py-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-white active:scale-[0.98]"
        >
          Sort: {currentLabel}
          {open ? (
            <ChevronUp size={15} aria-hidden="true" />
          ) : (
            <ChevronDown size={15} aria-hidden="true" />
          )}
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute bottom-full left-0 right-0 mb-2 animate-slide-up overflow-hidden rounded-2xl border border-blush-300 bg-white py-1 shadow-[0_8px_24px_rgba(229,96,74,0.18)]"
          >
            {SORT_OPTIONS.map((o) => {
              const active = o.value === sort;
              return (
                <li key={o.value}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(o.value)}
                    className={`flex min-h-11 w-full items-center justify-between px-4 py-3 text-left font-sans text-[14px] ${
                      active
                        ? "bg-blush-100 font-semibold text-coral-500"
                        : "text-ink hover:bg-blush-100"
                    }`}
                  >
                    {o.label}
                    {active && <Check size={16} aria-hidden="true" className="text-coral-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
