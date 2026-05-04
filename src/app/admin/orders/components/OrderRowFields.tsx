"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchVariantsAction } from "../actions";
import { formatPrice } from "@/lib/format";
import type { SelectedVariant } from "./StockChecker";

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted ${
        className ?? ""
      }`}
    >
      {children}
    </h3>
  );
}

export function Row({
  label,
  children,
  emphasize,
}: {
  label: string;
  children: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`font-sans text-xs uppercase tracking-wider ${
          emphasize ? "font-bold text-ink" : "text-ink-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${
          emphasize ? "font-bold text-ink" : "font-semibold text-ink"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  required?: boolean;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-md border-[1.5px] bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500 ${
          error ? "border-coral-500" : "border-blush-400"
        }`}
      />
      {error && (
        <span className="mt-0.5 block font-sans text-[11px] text-coral-700">{error}</span>
      )}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProductPicker({
  onPick,
}: {
  onPick: (v: SelectedVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SelectedVariant[]>([]);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const reqId = ++reqIdRef.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchVariantsAction(q, { availableOnly: true });
        if (reqId !== reqIdRef.current) return;
        setHits(
          res.map((v) => ({
            variantId: v.variantId,
            sku: v.sku,
            variantTitle: v.variantTitle,
            productTitle: v.productTitle,
            productThumbnail: v.productThumbnail,
            priceMur: v.priceMur,
          })),
        );
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative mt-2">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Add product (only in-stock variants shown)…"
        inputMode="search"
        className="w-full rounded-md border-[1.5px] border-blush-400 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-coral-500"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-blush-400 bg-white shadow-lg">
          {pending && (
            <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>
          )}
          {!pending && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-muted">
              No in-stock matches.
            </p>
          )}
          {hits.map((v) => (
            <button
              key={v.variantId}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(v);
                setQuery("");
                setHits([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blush-100"
            >
              {v.productThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.productThumbnail} alt="" className="h-9 w-9 rounded object-cover" />
              ) : (
                <div className="h-9 w-9 rounded bg-blush-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{v.productTitle}</p>
                <p className="font-mono text-[11px] text-ink-muted">
                  {v.sku ?? "—"} · {v.variantTitle ?? "Default"}
                </p>
              </div>
              {v.priceMur != null && (
                <span className="text-xs font-semibold text-ink">
                  {formatPrice(v.priceMur, "mur")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
