"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FocusTrapLayer } from "@/components/a11y/FocusTrapLayer";

export type SheetCategory = { id: string; name: string; handle: string; parent_category_id: string | null };
export type SheetFacets = { sizes: string[]; colors: string[]; priceMin: number; priceMax: number };

const HIDDEN_HANDLES = new Set(["toys", "uncategorized", "women"]);
const COLOR_HEX: Record<string, string> = {
  black: "#1c1010", white: "#ffffff", cream: "#FAF6F4", red: "#B8412C",
  burgundy: "#5C1F2A", pink: "#F8C4D4", blush: "#F2DDD8", nude: "#E8C9B0",
  brown: "#5e4030", grey: "#8a7773", blue: "#6FA8DC", navy: "#1F2A44",
  green: "#3a5a40", yellow: "#F4D03F", orange: "#F39C5B", coral: "#E5604A",
  purple: "#7E5A9B",
  multi: "conic-gradient(from 0deg,#E5604A,#F4D03F,#3a5a40,#6FA8DC,#7E5A9B,#E5604A)",
};

type SectionKey = "offers" | "category" | "size" | "color" | "price";

export function ShopFilterSheet({
  open,
  onClose,
  categories,
  stockedHandles,
  facets,
}: {
  open: boolean;
  onClose: () => void;
  categories: SheetCategory[];
  // Category handles that currently have at least one in-stock product. Empty
  // array (or undefined) ⇒ filter disabled so the tree never blanks out when
  // the upstream stock fetch fails.
  stockedHandles?: string[];
  facets: SheetFacets;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const setParam = (key: string, value: string | null, pendingId?: string) => {
    setPendingKey(pendingId ?? key);
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };
  // Multi-select: ?size=S,M means S OR M. URL stays comma-separated.
  const readMulti = (key: string): string[] => {
    const raw = params.get(key);
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  };
  const hasMulti = (key: string, val: string) => readMulti(key).includes(val);
  const toggleMulti = (key: string, val: string, pendingId: string) => {
    setPendingKey(pendingId);
    const current = readMulti(key);
    const next = new URLSearchParams(params.toString());
    const without = current.filter((v) => v !== val);
    const updated = without.length === current.length ? [...current, val] : without;
    if (updated.length === 0) next.delete(key);
    else next.set(key, updated.join(","));
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };
  const showSpinner = (id: string) => isPending && pendingKey === id;
  const has = (key: string, val: string) => params.get(key) === val;
  const activeCategory = params.get("category") ?? "";
  const activeSizes = readMulti("size");
  const activeColors = readMulti("color");
  const onSale = params.get("on_sale") === "1";

  const visible = useMemo(() => {
    const stocked = new Set(stockedHandles ?? []);
    const stockFilterActive = stocked.size > 0;
    const inStock = (handle: string) =>
      !stockFilterActive || stocked.has(handle);

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
      .filter((c) => inStock(c.handle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((root) => ({
        root,
        children: (childrenByParent.get(root.id) ?? [])
          .filter((c) => inStock(c.handle))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [categories, stockedHandles]);

  const initialMin = Number(params.get("price_min") ?? facets.priceMin) || facets.priceMin;
  const initialMax = Number(params.get("price_max") ?? facets.priceMax) || facets.priceMax;
  const [pMin, setPMin] = useState<number>(initialMin);
  const [pMax, setPMax] = useState<number>(initialMax);
  useEffect(() => {
    setPMin(Number(params.get("price_min") ?? facets.priceMin) || facets.priceMin);
    setPMax(Number(params.get("price_max") ?? facets.priceMax) || facets.priceMax);
  }, [params, facets.priceMin, facets.priceMax]);

  const priceActive =
    Number(params.get("price_min") ?? facets.priceMin) > facets.priceMin ||
    Number(params.get("price_max") ?? facets.priceMax) < facets.priceMax;

  const counts: Record<SectionKey, number> = {
    offers: onSale ? 1 : 0,
    category: activeCategory ? 1 : 0,
    size: activeSizes.length,
    color: activeColors.length,
    price: priceActive ? 1 : 0,
  };
  const totalActive = counts.offers + counts.category + counts.size + counts.color + counts.price;

  const [openSection, setOpenSection] = useState<SectionKey | null>("category");
  useEffect(() => {
    if (!open) return;
    const order: SectionKey[] = ["category", "color", "size", "price", "offers"];
    const firstActive = order.find((k) => counts[k] > 0);
    setOpenSection(firstActive ?? "category");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commitPrice = () => {
    setPendingKey("price");
    const next = new URLSearchParams(params.toString());
    if (pMin > facets.priceMin) next.set("price_min", String(pMin));
    else next.delete("price_min");
    if (pMax < facets.priceMax) next.set("price_max", String(pMax));
    else next.delete("price_max");
    next.delete("page");
    startTransition(() => {
      router.push(`/shop?${next.toString()}`);
    });
  };

  const clearAll = () => {
    setPendingKey("clear-all");
    const next = new URLSearchParams(params.toString());
    for (const k of ["on_sale", "category", "size", "color", "price_min", "price_max", "page"]) {
      next.delete(k);
    }
    startTransition(() => {
      router.push(next.toString() ? `/shop?${next.toString()}` : "/shop");
    });
  };

  if (!open) return null;

  return (
    <FocusTrapLayer
      ariaLabel="Filters"
      className="fixed inset-0 z-[120] md:hidden"
      onDeactivate={onClose}
    >
      <div className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] animate-slide-up flex-col rounded-t-[28px] bg-white shadow-[0_-12px_32px_rgba(28,16,16,0.18)]">
        <div className="flex justify-center pt-2.5 pb-1.5" onClick={onClose}>
          <span className="h-1.5 w-10 rounded-full bg-blush-300" aria-hidden />
        </div>

        <div className="flex items-center justify-between border-b border-blush-100 px-5 pb-3 pt-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-[22px] leading-none text-ink">Filters</h3>
            {totalActive > 0 && (
              <span className="rounded-full bg-coral-500 px-2 py-0.5 font-sans text-[10px] font-bold text-white">
                {totalActive}
              </span>
            )}
          </div>
          <button
            onClick={clearAll}
            disabled={totalActive === 0 || isPending}
            className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500 disabled:text-ink-muted/40"
          >
            {showSpinner("clear-all") && (
              <Spinner className="h-3.5 w-3.5 text-coral-500" />
            )}
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-2">
          <AccordionRow
            label="Offers"
            count={counts.offers}
            isOpen={openSection === "offers"}
            onToggle={() => setOpenSection((s) => (s === "offers" ? null : "offers"))}
          >
            <button
              onClick={() => setParam("on_sale", onSale ? null : "1", "on_sale")}
              disabled={isPending}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                onSale
                  ? "border-coral-500 bg-coral-500/10 text-coral-500"
                  : "border-blush-300 bg-white text-ink"
              } ${isPending ? "opacity-90" : ""}`}
            >
              <span className="font-sans text-[13px] font-semibold">On sale</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  onSale ? "border-coral-500 bg-coral-500" : "border-blush-400"
                }`}
                aria-hidden
              >
                {showSpinner("on_sale") ? (
                  <Spinner className="h-3 w-3 text-white" />
                ) : (
                  onSale && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white">
                      <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )
                )}
              </span>
            </button>
          </AccordionRow>

          <AccordionRow
            label="Category"
            count={counts.category}
            valueLabel={activeCategory ? toTitle(activeCategory) : undefined}
            isOpen={openSection === "category"}
            onToggle={() => setOpenSection((s) => (s === "category" ? null : "category"))}
          >
            <div className="space-y-1">
              {visible.map(({ root, children }) => (
                <div key={root.handle}>
                  <button
                    onClick={() =>
                      setParam(
                        "category",
                        activeCategory === root.handle ? null : root.handle,
                        `cat:${root.handle}`,
                      )
                    }
                    disabled={isPending}
                    className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left font-sans text-[14px] font-medium transition-colors ${
                      activeCategory === root.handle
                        ? "bg-coral-500/10 text-coral-500"
                        : "text-ink hover:bg-blush-100"
                    }`}
                  >
                    <span>{root.name}</span>
                    {showSpinner(`cat:${root.handle}`) ? (
                      <Spinner className="h-4 w-4 text-coral-500" />
                    ) : (
                      activeCategory === root.handle && (
                        <CloseIcon className="h-4 w-4 text-coral-500" />
                      )
                    )}
                  </button>
                  {children.length > 0 && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-blush-100 pl-2.5">
                      {children.map((c) => (
                        <button
                          key={c.handle}
                          onClick={() =>
                            setParam(
                              "category",
                              activeCategory === c.handle ? null : c.handle,
                              `cat:${c.handle}`,
                            )
                          }
                          disabled={isPending}
                          className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left font-sans text-[12px] transition-colors ${
                            activeCategory === c.handle
                              ? "font-semibold text-coral-500"
                              : "text-ink-soft hover:bg-blush-100"
                          }`}
                        >
                          <span>{c.name}</span>
                          {showSpinner(`cat:${c.handle}`) ? (
                            <Spinner className="h-4 w-4 text-coral-500" />
                          ) : (
                            activeCategory === c.handle && (
                              <CloseIcon className="h-3.5 w-3.5 text-coral-500" />
                            )
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionRow>

          {facets.sizes.length > 0 && (
            <AccordionRow
              label="Size"
              count={counts.size}
              valueLabel={activeSizes.length ? activeSizes.join(", ") : undefined}
              isOpen={openSection === "size"}
              onToggle={() => setOpenSection((s) => (s === "size" ? null : "size"))}
            >
              <div className="grid grid-cols-4 gap-2">
                {facets.sizes.map((s) => {
                  const active = hasMulti("size", s);
                  const loading = showSpinner(`size:${s}`);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleMulti("size", s, `size:${s}`)}
                      disabled={isPending}
                      aria-pressed={active}
                      className={`relative flex min-h-12 items-center justify-center rounded-xl border font-sans text-[12px] font-semibold transition-colors ${
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-blush-300 bg-white text-ink"
                      } ${isPending && !loading ? "opacity-80" : ""}`}
                    >
                      {loading ? (
                        <Spinner className={`h-4 w-4 ${active ? "text-white" : "text-ink"}`} />
                      ) : (
                        s
                      )}
                    </button>
                  );
                })}
              </div>
            </AccordionRow>
          )}

          {facets.colors.length > 0 && (
            <AccordionRow
              label="Color"
              count={counts.color}
              valueLabel={
                activeColors.length
                  ? activeColors.map(toTitle).join(", ")
                  : undefined
              }
              isOpen={openSection === "color"}
              onToggle={() => setOpenSection((s) => (s === "color" ? null : "color"))}
            >
              <div className="grid grid-cols-5 gap-3">
                {facets.colors.map((c) => {
                  const hex = COLOR_HEX[c] ?? "#8a7773";
                  const active = hasMulti("color", c);
                  const loading = showSpinner(`color:${c}`);
                  const light = isLight(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleMulti("color", c, `color:${c}`)}
                      disabled={isPending}
                      aria-label={c}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-1.5 ${
                        isPending && !loading ? "opacity-80" : ""
                      }`}
                    >
                      <span
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white transition ${
                          active || loading
                            ? "ring-2 ring-coral-500 ring-offset-2 ring-offset-white"
                            : "ring-1 ring-blush-300"
                        }`}
                        style={{ background: hex }}
                      >
                        {loading ? (
                          <>
                            <span
                              className={`absolute inset-0 rounded-full ${
                                light ? "bg-ink/10" : "bg-white/25"
                              }`}
                              aria-hidden
                            />
                            <Spinner
                              className={`relative h-5 w-5 ${light ? "text-ink" : "text-white"}`}
                            />
                          </>
                        ) : (
                          active && (
                            <svg viewBox="0 0 12 12" className={`h-4 w-4 ${light ? "text-ink" : "text-white"}`}>
                              <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )
                        )}
                      </span>
                      <span className={`font-sans text-[10px] capitalize ${active ? "font-semibold text-coral-500" : "text-ink-soft"}`}>
                        {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            </AccordionRow>
          )}

          {facets.priceMax > facets.priceMin && (
            <AccordionRow
              label="Price"
              count={counts.price}
              valueLabel={priceActive ? `Rs ${pMin}–${pMax}` : undefined}
              isOpen={openSection === "price"}
              onToggle={() => setOpenSection((s) => (s === "price" ? null : "price"))}
            >
              <div className="mb-3 flex items-center justify-between font-sans text-[12px] font-semibold text-ink">
                <span>Rs {pMin}</span>
                <span>Rs {pMax}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={facets.priceMin}
                  max={facets.priceMax}
                  value={pMin}
                  onChange={(e) => setPMin(Math.min(Number(e.target.value) || 0, pMax))}
                  onBlur={commitPrice}
                  onKeyDown={(e) => e.key === "Enter" && commitPrice()}
                  aria-label="Minimum price"
                  className="w-full min-h-11 rounded-xl border border-blush-300 bg-white px-3 py-2 font-sans text-[13px] text-ink outline-none focus:border-coral-500"
                />
                <span className="font-sans text-[12px] text-ink-muted">—</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={facets.priceMin}
                  max={facets.priceMax}
                  value={pMax}
                  onChange={(e) => setPMax(Math.max(Number(e.target.value) || 0, pMin))}
                  onBlur={commitPrice}
                  onKeyDown={(e) => e.key === "Enter" && commitPrice()}
                  aria-label="Maximum price"
                  className="w-full min-h-11 rounded-xl border border-blush-300 bg-white px-3 py-2 font-sans text-[13px] text-ink outline-none focus:border-coral-500"
                />
              </div>
            </AccordionRow>
          )}
          <div className="h-2" />
        </div>

        <div className="border-t border-blush-100 bg-white px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white active:scale-[0.99] disabled:opacity-80"
          >
            {isPending && <Spinner className="h-4 w-4 text-white" />}
            {isPending ? "Updating…" : "Show results"}
          </button>
        </div>
      </div>
    </FocusTrapLayer>
  );
}

function AccordionRow({
  label,
  count,
  valueLabel,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  valueLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-blush-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[16px] text-ink">{label}</span>
          {count > 0 && (
            <span className="rounded-full bg-coral-500 px-1.5 py-0.5 font-sans text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {valueLabel && (
            <span className="max-w-[140px] truncate font-sans text-[12px] text-ink-soft">
              {valueLabel}
            </span>
          )}
          <span
            className={`text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function toTitle(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isLight(color: string) {
  return ["white", "cream", "blush", "nude", "yellow", "pink"].includes(color);
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
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

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path
        d="M3 3L9 9M9 3L3 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
