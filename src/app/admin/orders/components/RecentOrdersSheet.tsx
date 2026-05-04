"use client";

import { useEffect, useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import type { OrderRow } from "@/lib/admin-orders";
import { updateOrderAction } from "../actions";
import { hydrateOrderToForm, rid, useOrderForm } from "./useOrderForm";
import { OrderFormLayout } from "./OrderRowFields";

const AUTO_LINE_RE = /^Delivery\s—|^Discount$|^Adjustment$/;

export function RecentOrdersSheet({
  orders,
  onChanged,
}: {
  orders: OrderRow[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-blush-400 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Recent orders</h2>
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          {orders.length} shown
        </span>
      </div>
      {orders.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">No orders yet.</p>
      )}
      {orders.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-blush-300/60 text-left text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="w-8"></th>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Way</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">City</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2">Products</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2">Pay</th>
                <th className="px-2 py-2">POS</th>
                <th className="px-2 py-2">Sale</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isEditing = editingId === o.id;
                if (isEditing) {
                  return (
                    <EditableRow
                      key={o.id}
                      order={o}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        setErrorBanner(null);
                        onChanged();
                      }}
                      onError={(msg) => setErrorBanner(msg)}
                    />
                  );
                }
                return (
                  <ReadOnlyRow
                    key={o.id}
                    order={o}
                    onEdit={() => {
                      setEditingId(o.id);
                      setErrorBanner(null);
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {errorBanner && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-coral-500 bg-coral-300/30 px-3 py-1.5 text-sm text-coral-700"
        >
          {errorBanner}
        </p>
      )}
    </section>
  );
}

function ReadOnlyRow({
  order,
  onEdit,
}: {
  order: OrderRow;
  onEdit: () => void;
}) {
  const trackingShown =
    order.deliveryMethod === "Postage" ||
    order.deliveryMethod === "Express Postage";
  const realItems = order.items.filter((it) => !AUTO_LINE_RE.test(it.title));
  const productCell =
    realItems.length === 0
      ? "—"
      : `${realItems.length}× ${realItems[0].title}${
          realItems.length > 1 ? " +" + (realItems.length - 1) : ""
        }`;
  const statusLabel =
    order.status === "canceled"
      ? "Cancelled"
      : order.fulfillmentStatus === "fulfilled"
        ? "Delivered"
        : "—";

  return (
    <tr className="border-b border-blush-300/40">
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit order"
          className="text-coral-700 transition hover:text-coral-500"
        >
          ✏️
        </button>
      </td>
      <td className="px-2 py-2 font-mono text-[11px]">#{order.displayId}</td>
      <td className="px-2 py-2 whitespace-nowrap">
        {new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })}
      </td>
      <td className="px-2 py-2">{order.deliveryMethod ?? "—"}</td>
      <td className="px-2 py-2 max-w-[180px] truncate">
        {order.buyerName || "—"}
      </td>
      <td className="px-2 py-2 max-w-[140px] truncate">{order.city ?? "—"}</td>
      <td className="px-2 py-2 whitespace-nowrap font-mono text-[11px]">
        {order.phone ?? "—"}
      </td>
      <td className="px-2 py-2 max-w-[200px] truncate">{productCell}</td>
      <td className="px-2 py-2 text-right font-bold">
        {formatPrice(order.totalMur, "mur")}
      </td>
      <td className="px-2 py-2">{order.paymentMethod ?? "—"}</td>
      <td className="px-2 py-2">{order.pointOfSale ?? "—"}</td>
      <td className="px-2 py-2">{order.saleType ?? "—"}</td>
      <td className="px-2 py-2">{statusLabel}</td>
      <td className="px-2 py-2 font-mono text-[11px]">
        {trackingShown ? (order.trackingNumber ?? "—") : ""}
      </td>
    </tr>
  );
}

function EditableRow({
  order,
  onCancel,
  onSaved,
  onError,
}: {
  order: OrderRow;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const form = useOrderForm(hydrateOrderToForm(order));
  const [showPseudo, setShowPseudo] = useState(!!order.pseudo);
  const [showEmail, setShowEmail] = useState(!!order.email);
  const [showManual, setShowManual] = useState(false);

  // Hydrate line items once per order (skip auto-appended Delivery / Discount /
  // Adjustment lines so the form only sees real product/manual lines).
  useEffect(() => {
    const realItems = order.items.filter(
      (it) => !AUTO_LINE_RE.test(it.title),
    );
    form.setItems(
      realItems.map((it) => ({
        rid: rid(),
        kind: it.variantId ? "variant" : "manual",
        variantId: it.variantId ?? undefined,
        sku: null,
        title: it.title,
        quantity: it.quantity,
        unitPriceMur: it.unitPriceMur,
      })),
    );
    // Intentional: re-hydrate only when the underlying order id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const [submitting, startTransition] = useTransition();

  function save() {
    if (Object.keys(form.fieldErrors).length > 0) {
      form.markTouched("buyerName", "phone", "city", "items");
      onError("Fill all required fields");
      return;
    }
    const payload = form.toCreateInput();
    startTransition(async () => {
      const res = await updateOrderAction(order.id, payload);
      if (res.ok) onSaved();
      else onError(res.error);
    });
  }

  return (
    <tr className="border-b border-blush-300/40 bg-blush-100/30">
      <td colSpan={14} className="p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
          Editing #{order.displayId}
        </p>
        <OrderFormLayout
          form={form}
          showPseudo={showPseudo}
          setShowPseudo={setShowPseudo}
          showEmail={showEmail}
          setShowEmail={setShowEmail}
          showManual={showManual}
          setShowManual={setShowManual}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-blush-400 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink transition hover:text-coral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="rounded-md bg-coral-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
}
