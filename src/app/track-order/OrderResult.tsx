// src/app/track-order/OrderResult.tsx
"use client";

import Image from "next/image";
import type { TrackOrderResponse, TrackOrderStatus } from "@/lib/track-order";
import { formatPrice } from "@/lib/format";
import { OrderTimeline } from "./OrderTimeline";

const STATUS_LABEL: Record<TrackOrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Out for delivery",
  delivered: "Delivered",
  canceled: "Canceled",
};

const STATUS_TONE: Record<TrackOrderStatus, string> = {
  placed: "bg-coral-500/10 text-coral-700",
  confirmed: "bg-coral-500/10 text-coral-700",
  packed: "bg-coral-500/10 text-coral-700",
  shipped: "bg-coral-500/10 text-coral-700",
  delivered: "bg-emerald-50 text-emerald-700",
  canceled: "bg-blush-300/30 text-ink-muted",
};

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-MU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrderResult({ data }: { data: TrackOrderResponse }) {
  const isCanceled = data.status === "canceled";

  return (
    <div className="rounded-2xl border border-blush-400 bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-[12px] uppercase tracking-wide text-ink-muted">
            Order
          </p>
          <p className="font-display text-2xl font-semibold text-ink">
            #{data.displayId}
          </p>
          <p className="mt-1 font-sans text-[12px] text-ink-muted">
            Placed {formatLongDate(data.placedAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
            STATUS_TONE[data.status]
          }`}
        >
          {STATUS_LABEL[data.status]}
        </span>
      </div>

      <div className="mt-8">
        {isCanceled ? (
          <div className="rounded-md border border-blush-300 bg-blush-100/40 px-4 py-4 font-sans text-sm text-ink-muted">
            Order canceled
            {data.canceledAt
              ? ` on ${formatLongDate(data.canceledAt)}`
              : ""}.
          </div>
        ) : (
          <OrderTimeline
            status={data.status}
            steps={data.steps}
            trackingCode={data.trackingCode}
            trackingUrl={data.trackingUrl}
          />
        )}
      </div>

      <div className="mt-8 border-t border-blush-100 pt-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">
          Items
        </h2>
        <ul className="space-y-4">
          {data.items.map((it, idx) => (
            <li key={idx} className="flex gap-3">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-blush-300">
                {it.thumbnail ? (
                  <Image
                    src={it.thumbnail}
                    alt={it.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-display text-[13px] font-medium text-ink">
                  {it.title}
                </span>
                <span className="font-sans text-[11px] text-ink-muted">
                  {it.variantTitle ? `${it.variantTitle} · ` : ""}Qty{" "}
                  {it.quantity}
                </span>
                <span className="mt-auto font-sans text-[13px] font-semibold text-ink">
                  {formatPrice(it.unitPrice * it.quantity, data.totals.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-1.5 font-sans text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd>{formatPrice(data.totals.subtotal, data.totals.currency)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Shipping</dt>
            <dd>{formatPrice(data.totals.shipping, data.totals.currency)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-blush-100 pt-3 font-display text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(data.totals.total, data.totals.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 border-t border-blush-100 pt-6">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">
          Delivering to
        </h2>
        <p className="font-sans text-sm text-ink-soft">
          {data.shippingAddress.firstName} {data.shippingAddress.lastName}
          <br />
          {data.shippingAddress.address1}
          {data.shippingAddress.address2
            ? `, ${data.shippingAddress.address2}`
            : ""}
          <br />
          {data.shippingAddress.city}, {data.shippingAddress.province}
          {data.shippingAddress.postalCode
            ? ` ${data.shippingAddress.postalCode}`
            : ""}
          <br />
          Mauritius
        </p>
      </div>
    </div>
  );
}
