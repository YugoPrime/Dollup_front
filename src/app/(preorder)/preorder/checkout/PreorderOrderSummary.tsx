"use client";

import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice } from "@/lib/format";
import { computeDeposit } from "@/lib/preorder-checkout";

type Cart = HttpTypes.StoreCart;

export function PreorderOrderSummary({ cart }: { cart: Cart }) {
  const items = cart.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const currency = cart.currency_code ?? "MUR";
  const itemSubtotal = cart.item_total ?? cart.subtotal ?? 0;
  const shipping = cart.shipping_total ?? 0;
  const { total, deposit, balance } = computeDeposit(itemSubtotal, shipping);

  return (
    <aside className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start">
      <div className="rounded-xl border border-sage-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Your pre-order
        </h2>
        <p className="mb-4 font-sans text-xs text-ink-muted">
          {itemCount} {itemCount === 1 ? "piece" : "pieces"} to reserve
        </p>

        <ul className="mb-5 space-y-4 border-b border-sage-100 pb-5">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative h-20 w-16 shrink-0">
                <div className="relative h-full w-full overflow-hidden rounded-md bg-sage-100">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_title ?? ""}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1 font-sans text-[10px] font-semibold text-white">
                  {item.quantity}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words font-display text-[13px] font-medium leading-snug text-ink">
                  {item.product_title}
                </span>
                <span className="font-sans text-[11px] text-ink-muted">
                  {item.variant_title}
                </span>
                <span className="mt-auto font-sans text-[13px] font-semibold text-ink">
                  {formatPrice((item.unit_price ?? 0) * item.quantity, currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 font-sans text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd>{formatPrice(itemSubtotal, currency)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Delivery</dt>
            <dd>{shipping === 0 ? "—" : formatPrice(shipping, currency)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-sage-100 pt-3 font-display text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(total, currency)}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-sage-200 bg-sage-50 p-4">
          <div className="flex justify-between font-sans text-sm font-semibold text-sage-900">
            <span>Deposit due now (75%)</span>
            <span>{formatPrice(deposit, currency)}</span>
          </div>
          <div className="mt-1.5 flex justify-between font-sans text-[13px] text-ink-soft">
            <span>Balance on arrival</span>
            <span>{formatPrice(balance, currency)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
