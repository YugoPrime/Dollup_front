"use client";

import {
  forwardRef,
  useImperativeHandle,
  useTransition,
} from "react";
import { createDmOrderAction } from "../actions";
import {
  DM_DELIVERY_METHODS,
  MU_DISTRICTS,
  type DmDeliveryMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import {
  PAYMENT_METHODS,
  POINTS_OF_SALE,
  SALE_TYPES,
  useOrderForm,
  type FormState,
  type SaleType,
} from "./useOrderForm";
import {
  Field,
  ProductPicker,
  Row,
  SectionLabel,
  Select,
} from "./OrderRowFields";
import type { SelectedVariant } from "./StockChecker";

export type NewOrderRowRef = {
  addVariant: (v: SelectedVariant) => void;
};

export const NewOrderRow = forwardRef<NewOrderRowRef>(function NewOrderRow(_, ref) {
  const form = useOrderForm();
  const {
    state,
    set,
    items,
    setItems,
    manual,
    setManual,
    markTouched,
    errorBanner,
    setErrorBanner,
    successBanner,
    setSuccessBanner,
    itemsSubtotal,
    manualLineTotal,
    discount,
    deliveryCost,
    computedTotal,
    finalTotal,
    adjustment,
    fieldErrors,
    showErr,
    addVariant,
    reset,
    toCreateInput,
  } = form;

  const [submitting, startTransition] = useTransition();

  useImperativeHandle(ref, () => ({
    addVariant,
  }));

  async function handleSubmit() {
    setErrorBanner(null);
    setSuccessBanner(null);
    markTouched("buyerFirstName", "phone", "address1", "items");
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = toCreateInput();

    startTransition(async () => {
      const res = await createDmOrderAction(payload);
      if (res.ok) {
        setSuccessBanner(`Order #${res.displayId} saved.`);
        reset();
      } else {
        setErrorBanner(res.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">New order</h2>
      </div>
      {successBanner && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-blush-300 bg-blush-100/60 px-3 py-1.5 text-sm text-ink"
        >
          {successBanner}
        </p>
      )}
      {errorBanner && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          {errorBanner}
        </p>
      )}

      <SectionLabel>Buyer</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Field
          label="First name"
          value={state.buyerFirstName}
          onChange={(v) => set("buyerFirstName", v)}
          onBlur={() => markTouched("buyerFirstName")}
          error={showErr("buyerFirstName")}
          required
        />
        <Field
          label="Last name"
          value={state.buyerLastName}
          onChange={(v) => set("buyerLastName", v)}
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
        <Field
          label="Email"
          type="email"
          value={state.email}
          onChange={(v) => set("email", v)}
        />
      </div>

      <SectionLabel className="mt-3">Address</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Field
          label="Address line"
          value={state.address1}
          onChange={(v) => set("address1", v)}
          onBlur={() => markTouched("address1")}
          error={showErr("address1")}
          required
          className="md:col-span-2"
        />
        <Field
          label="Details"
          value={state.address2}
          onChange={(v) => set("address2", v)}
        />
        <Field
          label="City / village"
          value={state.city}
          onChange={(v) => set("city", v)}
        />
        <Select
          label="District"
          value={state.district}
          onChange={(v) => set("district", v)}
          options={[{ value: "", label: "—" }, ...MU_DISTRICTS.map((d) => ({ value: d, label: d }))]}
        />
      </div>

      <SectionLabel className="mt-3">Products</SectionLabel>
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
      </div>

      <SectionLabel className="mt-3">Manual product</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
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

      <SectionLabel className="mt-3">Delivery & payment</SectionLabel>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3 md:grid-cols-6">
        <Select
          label="Delivery"
          value={state.deliveryMethod}
          onChange={(v) => set("deliveryMethod", v as DmDeliveryMethod)}
          options={DM_DELIVERY_METHODS.map((m) => ({ value: m, label: m }))}
          className="md:col-span-2"
        />
        <Field
          label="Delivery date"
          type="date"
          value={state.deliveryDate}
          onChange={(v) => set("deliveryDate", v)}
        />
        <Field
          label="Discount"
          type="number"
          inputMode="numeric"
          value={state.discountMur}
          onChange={(v) => set("discountMur", v)}
        />
        <Select
          label="Payment"
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
          className="md:col-span-2"
        />
        <label className="block md:col-span-4">
          <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Notes
          </span>
          <input
            type="text"
            value={state.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="optional internal note"
            className="w-full rounded-md border-[1.5px] border-blush-400 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-coral-500"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-blush-300/60 bg-cream/60 p-3 text-sm md:flex-row md:items-end md:gap-5">
        <div className="flex flex-1 flex-col gap-1">
          <Row label="Items subtotal">{formatPrice(itemsSubtotal + manualLineTotal, "mur")}</Row>
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
        <div className="flex flex-shrink-0 items-end gap-3">
          <label className="block">
            <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Total override
            </span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={String(computedTotal)}
              value={state.totalOverride}
              onChange={(e) => set("totalOverride", e.target.value)}
              className="w-28 rounded border-[1.5px] border-blush-400 bg-white px-2 py-1.5 text-right text-sm"
            />
          </label>
          <div className="flex flex-col items-end">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Final total
            </span>
            <span className="font-display text-2xl font-bold text-ink">
              {formatPrice(finalTotal, "mur")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-coral-500 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </section>
  );
});
