// src/app/checkout/OrderSummary.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { Tag } from "lucide-react";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice } from "@/lib/format";
import { readLoyaltyRedeemMetadata } from "@/lib/loyalty-client";
import { qualifiesForFreeHomeDelivery } from "@/lib/checkout";
import { clientSdk } from "@/lib/cart-client";
import { useCart } from "@/components/cart/CartProvider";

type Cart = HttpTypes.StoreCart;

type Props = {
  cart: Cart;
  submitting: boolean;
  onSubmit: () => void;
  loyaltySlot?: React.ReactNode;
  selectedShippingOption?: HttpTypes.StoreCartShippingOption | null;
};

type CartPromotion = NonNullable<Cart["promotions"]>[number];

function PromoCodeBox({ cart }: { cart: Cart }) {
  const { refreshCart } = useCart();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promotions = (cart.promotions ?? []) as CartPromotion[];

  async function setPromoCodes(codes: string[]) {
    await clientSdk.store.cart.update(cart.id, {
      promo_codes: codes,
    });
    await refreshCart();
  }

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const existing = promotions
        .map((p) => p.code)
        .filter((c): c is string => Boolean(c));
      if (existing.includes(trimmed)) {
        setError("That code is already applied.");
        return;
      }
      await setPromoCodes([...existing, trimmed]);
      setCode("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't apply that code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(promoCode: string) {
    setBusy(true);
    setError(null);
    try {
      const remaining = promotions
        .map((p) => p.code)
        .filter((c): c is string => Boolean(c) && c !== promoCode);
      await setPromoCodes(remaining);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't remove that code.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 border-b border-blush-100 pb-5">
      <p className="mb-2 flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
        <Tag aria-hidden className="h-3 w-3" />
        Promo
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Enter code"
          autoComplete="off"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-full border border-blush-300 px-4 py-2 font-sans text-[13px] text-ink outline-none focus:border-coral-500"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-full bg-coral-500 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
        >
          {busy ? "..." : "Apply"}
        </button>
      </div>
      {error && (
        <p className="mt-2 font-sans text-[12px] text-coral-700">{error}</p>
      )}
      {promotions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {promotions.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md bg-blush-100/60 px-3 py-1.5"
            >
              <span className="font-sans text-[12px] font-semibold text-ink">
                {p.code}
              </span>
              <button
                type="button"
                onClick={() => p.code && remove(p.code)}
                disabled={busy}
                aria-label={`Remove ${p.code}`}
                className="font-sans text-[12px] text-coral-700 transition hover:text-coral-500 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OrderSummary({
  cart,
  submitting,
  onSubmit,
  loyaltySlot,
  selectedShippingOption,
}: Props) {
  const items = cart.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const currency = cart.currency_code ?? "MUR";
  const itemSubtotal = cart.item_total ?? cart.subtotal ?? 0;
  const cartHasShippingMethod = (cart.shipping_methods?.length ?? 0) > 0;
  const fallbackShipping = selectedShippingOption?.amount ?? 0;
  const homeDeliveryFree = qualifiesForFreeHomeDelivery(
    selectedShippingOption?.name ?? "",
    itemSubtotal,
  );
  const shipping = cartHasShippingMethod
    ? (cart.shipping_total ?? 0)
    : homeDeliveryFree
      ? 0
      : fallbackShipping;
  const fallbackDiscount = cart.discount_total ?? 0;
  const total = cartHasShippingMethod
    ? (cart.total ?? 0)
    : Math.max(0, itemSubtotal + shipping - fallbackDiscount);
  const redeemMeta = readLoyaltyRedeemMetadata(
    cart.metadata as Record<string, unknown> | null | undefined,
  );
  const mysteryBox = readMysteryBoxMetadata(
    cart.metadata as Record<string, unknown> | null | undefined,
  );
  // discount_total is the cart-level promotion discount (Medusa Promotion
  // module). Loyalty redemption uses metadata-driven adjustments and lands
  // here too, so subtract that out to avoid double-counting in the UI.
  const promoDiscount = Math.max(
    0,
    (cart.discount_total ?? 0) - (redeemMeta?.discount_mur ?? 0),
  );

  return (
    <aside className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start">
      {loyaltySlot ? <div className="mb-4">{loyaltySlot}</div> : null}
      <div className="rounded-xl border border-blush-400 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Your order
        </h2>
        <p className="mb-4 font-sans text-xs text-ink-muted">
          {itemCount} {itemCount === 1 ? "item" : "items"} ready for checkout
        </p>

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
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-words font-display text-[13px] font-medium leading-snug text-ink">
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

        <PromoCodeBox cart={cart} />

        <dl className="space-y-1.5 font-sans text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd>{formatPrice(itemSubtotal, currency)}</dd>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-coral-500">
              <dt>Promo discount</dt>
              <dd>-{formatPrice(promoDiscount, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between text-ink-soft">
            <dt>Shipping</dt>
            <dd>
              {cartHasShippingMethod || selectedShippingOption
                ? shipping === 0
                  ? "Free"
                  : formatPrice(shipping, currency)
                : "—"}
            </dd>
          </div>
          {mysteryBox ? (
            <div className="rounded-lg border border-coral-500/40 bg-coral-50 p-3 text-coral-700">
              <dt className="font-sans text-[10px] font-bold uppercase tracking-[0.14em]">
                Mystery Box
              </dt>
              <dd className="mt-1 font-sans text-[12px] text-ink">
                Box <strong>{mysteryBox.id}</strong> - size {mysteryBox.size} -
                flat {formatPrice(mysteryBox.flat_price_mur, currency)}
              </dd>
            </div>
          ) : null}
          {redeemMeta ? (
            <div className="flex justify-between text-coral-500">
              <dt>Doll Rewards</dt>
              <dd>-Rs {redeemMeta.discount_mur.toLocaleString("en-MU")}</dd>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between border-t border-blush-100 pt-3 font-display text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(total, currency)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-5 hidden w-full items-center justify-center rounded-md bg-coral-500 px-4 py-3 font-sans text-sm font-semibold tracking-wide text-white transition-colors hover:bg-coral-700 disabled:opacity-60 lg:flex"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </button>
      </div>
    </aside>
  );
}

function readMysteryBoxMetadata(
  metadata: Record<string, unknown> | null | undefined,
): { id: string; size: string; flat_price_mur: number } | null {
  const raw = metadata?.mystery_box;
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const size = typeof record.size === "string" ? record.size : "";
  const flatPrice = Number(record.flat_price_mur);

  if (!id || !size || !Number.isFinite(flatPrice) || flatPrice <= 0) {
    return null;
  }

  return {
    id,
    size,
    flat_price_mur: Math.floor(flatPrice),
  };
}
