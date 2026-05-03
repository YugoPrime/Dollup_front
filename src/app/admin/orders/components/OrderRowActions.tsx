"use client";

import { useState, useTransition } from "react";
import {
  cancelOrderAction,
  markFulfilledAction,
  markPaidAction,
} from "../actions";

export function OrderRowActions({
  orderId,
  paymentStatus,
  fulfillmentStatus,
  status,
}: {
  orderId: string;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  status: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isCanceled = status === "canceled";
  const isPaid = paymentStatus === "captured";
  const isFulfilled =
    fulfillmentStatus === "fulfilled" ||
    fulfillmentStatus === "shipped" ||
    fulfillmentStatus === "delivered";

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error);
    });
  }

  if (isCanceled) {
    return (
      <p className="mt-3 text-xs italic text-ink-muted">Order canceled.</p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {!isPaid && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markPaidAction(orderId))}
          className="rounded-md border border-coral-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-coral-700 transition hover:bg-coral-500 hover:text-white disabled:opacity-50"
        >
          Mark paid
        </button>
      )}
      {!isFulfilled && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markFulfilledAction(orderId))}
          className="rounded-md border border-blush-400 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink transition hover:bg-blush-100 disabled:opacity-50"
        >
          Mark fulfilled
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Cancel this order? This frees the inventory.")) {
            run(() => cancelOrderAction(orderId));
          }
        }}
        className="ml-auto rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted transition hover:text-coral-700 disabled:opacity-50"
      >
        Cancel
      </button>
      {error && (
        <span className="basis-full text-[11px] text-coral-700">{error}</span>
      )}
    </div>
  );
}
