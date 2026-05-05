"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchVariantsAction } from "../actions";
import { formatPrice } from "@/lib/format";
import {
  DM_DELIVERY_METHODS,
  type DmDeliveryMethod,
} from "@/lib/checkout";
import type { SelectedVariant } from "./StockChecker";
import {
  PAYMENT_METHODS,
  POINTS_OF_SALE,
  SALE_TYPES,
  type FormState,
  type SaleType,
  type UseOrderFormResult,
} from "./useOrderForm";
import { VatBreakdown } from "./VatBreakdown";

const STATUS_OPTIONS = [
  { value: "", label: "Preparation" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

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

// ---------------------------------------------------------------------------
// Shared layout for the entry row + the inline-edit row + the mobile drawer.
// All field rendering lives here so NewOrderRow / EditableRow / drawer don't
// duplicate JSX.
// ---------------------------------------------------------------------------

export function OrderFormLayout({
  form,
  showPseudo,
  setShowPseudo,
  showEmail,
  setShowEmail,
  showManual,
  setShowManual,
}: {
  form: UseOrderFormResult;
  showPseudo: boolean;
  setShowPseudo: (v: boolean) => void;
  showEmail: boolean;
  setShowEmail: (v: boolean) => void;
  showManual: boolean;
  setShowManual: (v: boolean) => void;
}) {
  const {
    state,
    set,
    items,
    setItems,
    manual,
    setManual,
    markTouched,
    showErr,
    addVariant,
    itemsSubtotal,
    manualLineTotal,
    discount,
    autoDeliveryCost,
    deliveryCost,
    computedTotal,
    finalTotal,
    adjustment,
  } = form;

  const trackingApplies =
    state.deliveryMethod === "Postage" ||
    state.deliveryMethod === "Express Postage";
  const manualOpen = showManual || !!manual.title || !!manual.price;

  return (
    <>
      {/* Customer & Delivery — 8 inputs in a 4-col grid (2 rows on lg+,
          2 cols on sm). Delivery date, Way, Name, Pseudo, City, Address
          details, Phone, Email. */}
      <SectionLabel className="mt-2">Customer & delivery</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Delivery date"
          type="date"
          value={state.deliveryDate}
          onChange={(v) => set("deliveryDate", v)}
        />
        <Select
          label="Way of delivery"
          value={state.deliveryMethod}
          onChange={(v) => set("deliveryMethod", v as DmDeliveryMethod)}
          options={DM_DELIVERY_METHODS.map((m) => ({ value: m, label: m }))}
        />
        <Field
          label="Name"
          value={state.buyerName}
          onChange={(v) => set("buyerName", v)}
          onBlur={() => markTouched("buyerName")}
          error={showErr("buyerName")}
          required
        />
        <div className="flex items-end">
          {!showPseudo && !state.pseudo ? (
            <button
              type="button"
              onClick={() => setShowPseudo(true)}
              className="text-xs text-coral-700 transition hover:text-coral-500"
            >
              + Add pseudo
            </button>
          ) : (
            <Field
              label="Pseudo / IG handle"
              value={state.pseudo}
              onChange={(v) => set("pseudo", v)}
              className="w-full"
            />
          )}
        </div>
        <Field
          label="City"
          value={state.city}
          onChange={(v) => set("city", v)}
          onBlur={() => markTouched("city")}
          error={showErr("city")}
          required
        />
        <Field
          label="Address details"
          value={state.address2}
          onChange={(v) => set("address2", v)}
        />
        <Field
          label="Phone"
          type="tel"
          inputMode="numeric"
          value={state.phone}
          onChange={(v) => set("phone", v)}
          onBlur={() => markTouched("phone")}
          error={showErr("phone")}
          required
        />
        <div className="flex items-end">
          {!showEmail && !state.email ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-xs text-coral-700 transition hover:text-coral-500"
            >
              + Add email
            </button>
          ) : (
            <Field
              label="Email"
              type="email"
              value={state.email}
              onChange={(v) => set("email", v)}
              className="w-full"
            />
          )}
        </div>
      </div>

      {/* 7-9. Products + Custom Notes */}
      <SectionLabel className="mt-2">Products</SectionLabel>
      <div className="mt-1.5">
        <ProductPicker onPick={addVariant} />
        {items.length === 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            No products yet — search above or use the stock checker.
          </p>
        )}
        {items.length > 0 && (
          <ul className="mt-3 divide-y divide-blush-300/60 rounded-lg border border-blush-300/60">
            {items.map((it) => (
              <li key={it.rid} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{it.title}</p>
                  <p className="font-mono text-[11px] text-ink-muted">
                    {it.sku ?? (it.kind === "manual" ? "Manual" : "—")}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => {
                    const q = Math.max(1, Number.parseInt(e.target.value || "1", 10));
                    setItems((prev) =>
                      prev.map((p) => (p.rid === it.rid ? { ...p, quantity: q } : p)),
                    );
                  }}
                  className="w-14 rounded border-[1.5px] border-blush-400 bg-cream px-2 py-1 text-center text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={it.unitPriceMur}
                  onChange={(e) => {
                    const p = Math.max(0, Number.parseInt(e.target.value || "0", 10));
                    setItems((prev) =>
                      prev.map((x) => (x.rid === it.rid ? { ...x, unitPriceMur: p } : x)),
                    );
                  }}
                  className="w-20 rounded border-[1.5px] border-blush-400 bg-cream px-2 py-1 text-right text-sm"
                />
                <span className="w-20 text-right text-sm font-semibold text-ink">
                  {formatPrice(it.quantity * it.unitPriceMur, "mur")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => prev.filter((p) => p.rid !== it.rid))
                  }
                  className="text-coral-700 transition hover:text-coral-500"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {showErr("items") && (
          <p className="mt-2 text-xs text-coral-700">{showErr("items")}</p>
        )}
        <label className="mt-3 block">
          <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Custom notes
          </span>
          <textarea
            value={state.customNotes}
            onChange={(e) => set("customNotes", e.target.value)}
            placeholder="e.g. all small even though M selected, hide price"
            rows={2}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
          />
        </label>
      </div>

      {/* Manual product (collapsible) */}
      <SectionLabel className="mt-2">Manual product</SectionLabel>
      <div className="mt-1.5">
        {!manualOpen ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="text-xs text-coral-700 transition hover:text-coral-500"
          >
            + Add manual product
          </button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field
              label="Title"
              value={manual.title}
              onChange={(v) => setManual((m) => ({ ...m, title: v }))}
              className="sm:col-span-2"
            />
            <Field
              label="Price (MUR)"
              type="number"
              inputMode="numeric"
              value={manual.price}
              onChange={(v) => setManual((m) => ({ ...m, price: v }))}
            />
          </div>
        )}
      </div>

      {/* Money + Payment + Status — 7 inputs in one row at lg+:
          delivery fee | discount | total override | method | POS | sale type | status */}
      <SectionLabel className="mt-2">Money & payment</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <label className="block">
          <span className="mb-1 flex items-center justify-between font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <span>Delivery fee</span>
            {state.deliveryFee.trim() !== "" && (
              <button
                type="button"
                onClick={() => set("deliveryFee", "")}
                className="text-[10px] font-semibold normal-case tracking-normal text-coral-700 transition hover:text-coral-500"
                title="Reset to auto"
              >
                ↻ auto
              </button>
            )}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={state.deliveryFee}
            onChange={(e) => set("deliveryFee", e.target.value)}
            placeholder={String(autoDeliveryCost)}
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
          />
        </label>
        <Field
          label="Discount"
          type="number"
          inputMode="numeric"
          value={state.discountMur}
          onChange={(v) => set("discountMur", v)}
        />
        <Field
          label="Total override"
          type="number"
          inputMode="numeric"
          value={state.totalOverride}
          onChange={(v) => set("totalOverride", v)}
        />
        <Select
          label="Method of payment"
          value={state.paymentMethod}
          onChange={(v) => set("paymentMethod", v as FormState["paymentMethod"])}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        />
        <Select
          label="Point of sale"
          value={state.pointOfSale}
          onChange={(v) => set("pointOfSale", v as FormState["pointOfSale"])}
          options={POINTS_OF_SALE.map((m) => ({ value: m, label: m }))}
        />
        <Select
          label="Sale type"
          value={state.saleType}
          onChange={(v) => set("saleType", v as SaleType)}
          options={SALE_TYPES.map((s) => ({ value: s.value, label: s.label }))}
        />
        <Select
          label="Status"
          value={state.status}
          onChange={(v) => set("status", v as FormState["status"])}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Tracking — only when Postage / Express Postage */}
      {trackingApplies && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <Field
            label="Tracking #"
            value={state.trackingNumber}
            onChange={(v) => set("trackingNumber", v)}
            className="lg:col-span-2"
          />
        </div>
      )}

      {/* Totals summary */}
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-blush-300/60 bg-cream/60 p-3 text-sm md:flex-row md:items-end md:gap-5">
        <div className="flex flex-1 flex-col gap-1">
          <Row label="Items subtotal">
            {formatPrice(itemsSubtotal + manualLineTotal, "mur")}
          </Row>
          {discount > 0 && (
            <Row label="Discount">- {formatPrice(discount, "mur")}</Row>
          )}
          <Row label={`Delivery (${state.deliveryMethod})`}>
            {deliveryCost === 0 ? "Free" : formatPrice(deliveryCost, "mur")}
          </Row>
          <Row label="Computed total">{formatPrice(computedTotal, "mur")}</Row>
          {adjustment !== 0 && (
            <Row label="Adjustment line">
              {adjustment > 0 ? "+" : ""}
              {formatPrice(adjustment, "mur")}
            </Row>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Final total
          </span>
          <span className="font-display text-2xl font-bold text-ink">
            {formatPrice(finalTotal, "mur")}
          </span>
          <VatBreakdown total={finalTotal} paymentMethod={state.paymentMethod} />
        </div>
      </div>
    </>
  );
}
