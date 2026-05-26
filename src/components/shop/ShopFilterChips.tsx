"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const CATEGORIES = ["dresses", "lingerie", "beachwear", "accessories"];

export function ShopFilterChips({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const activeCategory = params.get("category");
  const sort = params.get("sort") ?? "new";
  const onSale = params.get("on_sale") === "1";

  const setParam = (key: string, value: string | null, pendingId: string) => {
    setPendingKey(pendingId);
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };

  const showSpinner = (id: string) => isPending && pendingKey === id;

  return (
    <div className="sticky top-0 z-[5] flex gap-2 overflow-x-auto border-b border-blush-100 bg-white px-4 py-2.5 md:hidden">
      <button
        onClick={onOpenFilters}
        className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-blush-300 bg-blush-100 px-3.5 py-2 font-sans text-[11px] font-semibold text-ink"
      >
        ⚙ Filters
      </button>
      <button
        onClick={() => setParam("on_sale", onSale ? null : "1", "sale")}
        disabled={isPending}
        aria-pressed={onSale}
        className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border py-2 pl-3.5 font-sans text-[11px] font-semibold transition-colors ${
          onSale
            ? "border-coral-500 bg-coral-500 pr-1.5 text-white"
            : "border-blush-400 bg-white pr-3.5 text-ink"
        } ${isPending ? "opacity-90" : ""}`}
      >
        <span>Sale</span>
        {onSale && <CloseBadge loading={showSpinner("sale")} />}
      </button>
      {CATEGORIES.map((c) => {
        const active = activeCategory === c;
        return (
          <button
            key={c}
            onClick={() => setParam("category", active ? null : c, `cat:${c}`)}
            disabled={isPending}
            aria-pressed={active}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border py-2 pl-3.5 font-sans text-[11px] font-semibold capitalize transition-colors ${
              active
                ? "border-ink bg-ink pr-1.5 text-white"
                : "border-blush-400 bg-white pr-3.5 text-ink"
            } ${isPending ? "opacity-90" : ""}`}
          >
            <span>{c}</span>
            {active && <CloseBadge loading={showSpinner(`cat:${c}`)} />}
          </button>
        );
      })}
      <button
        onClick={() =>
          setParam("sort", sort === "new" ? "popular" : "new", "sort")
        }
        disabled={isPending}
        className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[11px] font-semibold text-ink ${
          isPending ? "opacity-90" : ""
        }`}
      >
        {showSpinner("sort") ? (
          <Spinner className="h-3.5 w-3.5 text-ink-soft" />
        ) : null}
        Sort: {sort === "new" ? "Newest" : "Popular"} ▾
      </button>
    </div>
  );
}

function CloseBadge({ loading }: { loading: boolean }) {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white"
    >
      {loading ? (
        <Spinner className="h-3.5 w-3.5 text-white" />
      ) : (
        <svg viewBox="0 0 12 12" className="h-3 w-3">
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden
    >
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
