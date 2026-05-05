"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { OrderRow, PrepTab } from "@/lib/admin-orders";
import { isAutoLine } from "@/lib/admin-order-lines";
import {
  markReadyAction,
  markShippedAction,
  setTrackingAction,
} from "../actions";

const BY_POST_TAB: PrepTab = "by_post";

function isOrderByPost(deliveryMethod: string | null): boolean {
  if (!deliveryMethod) return false;
  return (
    deliveryMethod === "Postage" ||
    deliveryMethod === "Express Postage" ||
    deliveryMethod === "Rodrigues Postage"
  );
}

export function PrepOrderCard({
  order,
  tab,
  onDone,
}: {
  order: OrderRow;
  // Optional — when omitted (e.g. "All" tab), the by-post branch is decided
  // from the order's own delivery_method instead of the tab.
  tab?: PrepTab;
  onDone: (orderId: string) => void;
}) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isByPost =
    tab === BY_POST_TAB ||
    (tab === undefined && isOrderByPost(order.deliveryMethod));
  const actionLabel = isByPost ? "Mark Shipped" : "Mark Ready";
  const showTracking = isByPost;
  const lacksTracking = isByPost && !tracking.trim();

  function handleAction() {
    setError(null);
    startTransition(async () => {
      try {
        if (isByPost && tracking.trim() !== (order.trackingNumber ?? "")) {
          await setTrackingAction(order.id, tracking);
        }
        if (isByPost) await markShippedAction(order.id);
        else await markReadyAction(order.id);
        onDone(order.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const realItems = order.items.filter((i) => !isAutoLine(i.title));

  return (
    <article className="rounded-lg border border-ink-soft/20 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-lg leading-tight text-ink">
            #{order.displayId} — {order.buyerName || "—"}
          </div>
          <div className="text-xs text-ink-muted">{order.deliveryMethod}</div>
        </div>
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
            className="whitespace-nowrap text-sm text-coral-700 underline"
          >
            {order.phone}
          </a>
        )}
      </header>

      <div className="mb-3 rounded bg-blush-100/40 px-3 py-2 text-sm leading-snug">
        <div className="font-medium">{order.city ?? "—"}</div>
        {order.addressDetails && order.addressDetails !== order.city && (
          <div className="text-ink-muted">{order.addressDetails}</div>
        )}
      </div>

      {order.customNotes && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {order.customNotes}
        </p>
      )}

      <ul className="mb-3 grid gap-2">
        {realItems.map((it) => (
          <li key={it.id} className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-blush-100">
              {it.thumbnail && (
                <Image
                  src={it.thumbnail}
                  alt={it.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium text-ink">{it.title}</div>
              <div className="text-xs text-ink-muted">
                {it.variantTitle ?? it.sku ?? ""}
                {it.variantTitle && it.sku ? ` · ${it.sku}` : ""}
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums">×{it.quantity}</div>
          </li>
        ))}
      </ul>

      {showTracking && (
        <label className="mb-3 block text-xs text-ink-muted">
          Tracking number
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="optional — can be added later"
            className="mt-1 block w-full rounded border border-ink-soft/30 px-2 py-1.5 text-sm"
          />
        </label>
      )}

      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={handleAction}
        disabled={isSaving}
        className="w-full rounded-md bg-ink py-3 text-sm font-semibold text-cream disabled:opacity-50"
      >
        {isSaving ? "Saving…" : actionLabel}
        {lacksTracking && !isSaving && (
          <span className="ml-2 text-xs font-normal opacity-70">(no tracking)</span>
        )}
      </button>
    </article>
  );
}
