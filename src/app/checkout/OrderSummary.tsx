// src/app/checkout/OrderSummary.tsx
"use client";

import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice } from "@/lib/format";

type Cart = HttpTypes.StoreCart;

type Props = {
  cart: Cart;
  submitting: boolean;
  onSubmit: () => void;
  submitDisabled: boolean;
  errorBanner?: string | null;
};

export function OrderSummary({
  cart,
  submitting,
  onSubmit,
  submitDisabled,
  errorBanner,
}: Props) {
  const items = cart.items ?? [];
  const currency = cart.currency_code ?? "MUR";
  const subtotal = cart.subtotal ?? 0;
  const shipping = cart.shipping_total ?? 0;
  const total = cart.total ?? 0;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl border border-blush-400 bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Your order
        </h2>

        <ul className="mb-5 space-y-4 border-b border-blush-100 pb-5">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-blush-300">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.product_title ?? ""}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : null}
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 font-sans text-[10px] font-semibold text-white">
                  {item.quantity}
                </span>
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-display text-[13px] font-medium text-ink">
                  {item.product_title}
                </span>
                <span className="font-sans text-[11px] text-ink-muted">
                  {item.variant_title}
                </span>
                <span className="mt-auto font-sans text-[13px] font-semibold text-ink">
                  {formatPrice(
                    (item.unit_price ?? 0) * item.quantity,
                    currency,
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 font-sans text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Shipping</dt>
            <dd>
              {cart.shipping_methods?.length
                ? formatPrice(shipping, currency)
                : "—"}
            </dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-blush-100 pt-3 font-display text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(total, currency)}</dd>
          </div>
        </dl>

        {errorBanner ? (
          <div className="mt-4 rounded-md border border-coral-300 bg-coral-50 p-3 font-sans text-xs text-coral-700">
            {errorBanner}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || submitting}
          className="mt-5 hidden w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold tracking-wide text-white transition-colors hover:bg-coral-700 disabled:opacity-60 lg:flex"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </button>

        <p className="mt-3 font-sans text-[11px] text-ink-muted">
          Cash on delivery. We&apos;ll call you to confirm before dispatching.
        </p>
      </div>
    </aside>
  );
}
