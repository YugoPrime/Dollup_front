"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { OrderRow } from "@/lib/admin-orders";
import { isAutoLine } from "@/lib/admin-order-lines";
import { formatPrice } from "@/lib/format";
import {
  markReadyAction,
  markShippedAction,
  setTrackingAction,
} from "../actions";

// Medusa's order payment_status enum is "not_paid" | "awaiting" | "authorized"
// | "partially_authorized" | "captured" | "partially_captured" | ... — there is
// no "paid" today. Spec wants both names accepted in case Medusa renames or a
// legacy value sneaks in, so we honour that defensively.
function isPaid(paymentStatus: string | null): boolean {
  return paymentStatus === "captured" || paymentStatus === "paid";
}

function isOrderByPost(deliveryMethod: string | null): boolean {
  if (!deliveryMethod) return false;
  return (
    deliveryMethod === "Postage" ||
    deliveryMethod === "Express Postage" ||
    deliveryMethod === "Rodrigues Postage"
  );
}

export function PrepOrderRow({
  order,
  onDone,
}: {
  order: OrderRow;
  onDone: (orderId: string) => void;
}) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byPost = isOrderByPost(order.deliveryMethod);
  const actionLabel = byPost ? "Mark Shipped" : "Mark Ready";
  const showTracking = byPost;
  const lacksTracking = byPost && !tracking.trim();
  const paid = isPaid(order.paymentStatus);

  function handleAction() {
    setError(null);
    startTransition(async () => {
      try {
        if (byPost && tracking.trim() !== (order.trackingNumber ?? "")) {
          await setTrackingAction(order.id, tracking);
        }
        if (byPost) await markShippedAction(order.id);
        else await markReadyAction(order.id);
        onDone(order.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const realItems = order.items.filter((i) => !isAutoLine(i.title));
  const addressLine = [order.addressDetails, order.city]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="rounded-lg border border-ink-soft/20 bg-white p-3 shadow-sm">
      {/* Header row: order # · name · phone · delivery method pill */}
      <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-ink-muted">#{order.displayId}</span>
        <span className="font-medium text-ink">{order.buyerName || "—"}</span>
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
            className="text-sm text-coral-700 underline"
          >
            {order.phone}
          </a>
        )}
        {order.deliveryMethod && (
          <span className="ml-auto rounded-full bg-blush-100 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {order.deliveryMethod}
          </span>
        )}
      </header>

      {/* Address line — single line, ellipsis if too long */}
      {addressLine && (
        <p className="mb-2 truncate text-xs text-ink-muted" title={addressLine}>
          {addressLine}
        </p>
      )}

      {/* Products inline */}
      {realItems.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {realItems.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-1.5 rounded border border-ink-soft/15 bg-cream-50/60 px-1.5 py-1"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-blush-100">
                {it.thumbnail && (
                  <Image
                    src={it.thumbnail}
                    alt={it.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </div>
              <span className="rounded bg-ink/90 px-1.5 py-0.5 text-[10px] font-semibold text-cream tabular-nums">
                ×{it.quantity}
              </span>
              <span className="max-w-[140px] truncate text-[11px] text-ink-muted">
                {it.variantTitle ?? it.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Customer notes — amber tinted, smaller padding than card */}
      {order.customNotes && (
        <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {order.customNotes}
        </p>
      )}

      {/* Tracking input on by-post */}
      {showTracking && (
        <label className="mb-2 block text-[11px] text-ink-muted">
          Tracking
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="optional — can be added later"
            className="mt-0.5 block w-full rounded border border-ink-soft/30 px-2 py-1 text-xs"
          />
        </label>
      )}

      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}

      {/* Footer: total · payment method · PAID badge · action */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-lg font-semibold tabular-nums text-ink">
            {formatPrice(order.totalMur, "MUR")}
          </span>
          {order.paymentMethod && (
            <span className="text-[11px] text-ink-muted">{order.paymentMethod}</span>
          )}
          {paid && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
              Paid
            </span>
          )}
        </div>
        <button
          onClick={handleAction}
          disabled={isSaving}
          className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50"
        >
          {isSaving ? "Saving…" : actionLabel}
          {lacksTracking && !isSaving && (
            <span className="ml-1.5 text-[10px] font-normal opacity-70">
              (no tracking)
            </span>
          )}
        </button>
      </div>
    </article>
  );
}
