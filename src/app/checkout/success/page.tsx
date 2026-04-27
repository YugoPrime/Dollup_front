// src/app/checkout/success/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";
import { clientSdk } from "@/lib/cart-client";
import { formatPrice } from "@/lib/format";

const ORDER_FIELDS =
  "*items,*items.variant,*shipping_address,*billing_address,*shipping_methods,+subtotal,+total,+shipping_total,+tax_total";

function CheckoutSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order");
  const [order, setOrder] = useState<HttpTypes.StoreOrder | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const { order } = await clientSdk.store.order.retrieve(orderId, {
          fields: ORDER_FIELDS,
        });
        setOrder(order);
      } catch {
        setError(true);
      }
    })();
  }, [orderId, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          Your order was placed.
        </p>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          We couldn&apos;t load the confirmation details right now. Please save
          your order ID:
        </p>
        <p className="mt-3 font-sans text-base font-semibold text-ink">
          {orderId}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-coral-500 px-7 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center font-sans text-sm text-ink-muted">
        Loading your order…
      </div>
    );
  }

  const currency = order.currency_code ?? "MUR";
  const ship = order.shipping_address;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-20">
      <div className="rounded-2xl border border-blush-400 bg-white p-8 lg:p-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Thank you, {ship?.first_name}!
          </h1>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            Order <span className="font-semibold text-ink">#{order.display_id}</span>
          </p>
          <p className="mt-3 font-sans text-sm text-ink-soft">
            We&apos;ll call you on{" "}
            <span className="font-semibold">{ship?.phone}</span> to confirm
            delivery — typically within 1–2 business days.
          </p>
        </div>

        <div className="mb-8 border-y border-blush-100 py-6">
          <h2 className="mb-4 font-display text-base font-semibold text-ink">
            Order summary
          </h2>
          <ul className="space-y-4">
            {(order.items ?? []).map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-blush-300">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_title ?? ""}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="font-display text-[13px] font-medium text-ink">
                    {item.product_title}
                  </span>
                  <span className="font-sans text-[11px] text-ink-muted">
                    {item.variant_title} · Qty {item.quantity}
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
          <dl className="mt-6 space-y-1.5 font-sans text-sm">
            <div className="flex justify-between text-ink-soft">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.subtotal ?? 0, currency)}</dd>
            </div>
            <div className="flex justify-between text-ink-soft">
              <dt>Shipping</dt>
              <dd>{formatPrice(order.shipping_total ?? 0, currency)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-blush-100 pt-3 font-display text-base font-semibold text-ink">
              <dt>Total</dt>
              <dd>{formatPrice(order.total ?? 0, currency)}</dd>
            </div>
          </dl>
        </div>

        {ship && (
          <div className="mb-8">
            <h2 className="mb-2 font-display text-base font-semibold text-ink">
              Delivering to
            </h2>
            <p className="font-sans text-sm text-ink-soft">
              {ship.first_name} {ship.last_name}
              <br />
              {ship.address_1}
              {ship.address_2 ? `, ${ship.address_2}` : ""}
              <br />
              {ship.city}, {ship.province}
              {ship.postal_code ? ` ${ship.postal_code}` : ""}
              <br />
              Mauritius
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/shop"
            className="flex-1 rounded-md bg-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-white hover:bg-coral-700"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-md border-[1.5px] border-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-coral-500 hover:bg-blush-100"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-20 text-center font-sans text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}
