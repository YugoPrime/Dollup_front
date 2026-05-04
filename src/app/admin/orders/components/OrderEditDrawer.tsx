"use client";

import { useEffect, useState, useTransition } from "react";
import type { OrderRow } from "@/lib/admin-orders";
import { isAutoLine } from "@/lib/admin-order-lines";
import { hydrateOrderToForm, rid, useOrderForm } from "./useOrderForm";
import { OrderFormLayout } from "./OrderRowFields";
import { updateOrderAction } from "../actions";

export function OrderEditDrawer({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Render-null-on-closed is fine; the inner Body is keyed on order.id so it
  // re-mounts (and re-hydrates useOrderForm's initial state) whenever the
  // selected order changes.
  if (!open || !order) return null;
  return (
    <DrawerBody
      key={order.id}
      order={order}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function DrawerBody({
  order,
  onClose,
  onSaved,
}: {
  order: OrderRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useOrderForm(hydrateOrderToForm(order));
  const [showPseudo, setShowPseudo] = useState(!!order.pseudo);
  const [showEmail, setShowEmail] = useState(!!order.email);
  const [showManual, setShowManual] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Hydrate items once on mount (skip auto-appended Delivery/Discount/
  // Adjustment lines so the form only sees real product/manual lines).
  useEffect(() => {
    const realItems = order.items.filter((it) => !isAutoLine(it.title));
    form.setItems(
      realItems.map((it) => ({
        rid: rid(),
        kind: it.variantId ? ("variant" as const) : ("manual" as const),
        variantId: it.variantId ?? undefined,
        sku: null,
        title: it.title,
        quantity: it.quantity,
        unitPriceMur: it.unitPriceMur,
      })),
    );
    // Body is re-mounted per order via key, so single-shot hydration is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll + close on Escape while drawer is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function save() {
    if (Object.keys(form.fieldErrors).length > 0) {
      form.markTouched("buyerName", "phone", "city", "items");
      setError("Fill all required fields");
      return;
    }
    const payload = form.toCreateInput();
    startTransition(async () => {
      const res = await updateOrderAction(order.id, payload);
      if (res.ok) onSaved();
      else setError(res.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Editing order #${order.displayId}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex-1"
      />
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-blush-400 bg-white p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">
            Editing #{order.displayId}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted transition hover:text-coral-700"
            aria-label="Close edit drawer"
          >
            ✕
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-coral-500 bg-coral-300/30 p-2 text-xs text-coral-700"
          >
            {error}
          </p>
        )}
        <OrderFormLayout
          form={form}
          showPseudo={showPseudo}
          setShowPseudo={setShowPseudo}
          showEmail={showEmail}
          setShowEmail={setShowEmail}
          showManual={showManual}
          setShowManual={setShowManual}
        />
        <div className="sticky bottom-0 -mx-3 mt-3 flex justify-end gap-2 border-t border-blush-300 bg-white px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-blush-400 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-ink transition hover:text-coral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
