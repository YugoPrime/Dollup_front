"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutFields } from "@/components/checkout/CheckoutFields";
import { getCartSdk } from "@/lib/cart-client";
import { cartTypeOf } from "@/lib/cart-type";
import { formatPrice } from "@/lib/format";
import {
  EMPTY_CHECKOUT_STATE,
  shippingOptionToDeliveryMethod,
  toMedusaAddress,
  validateCheckout,
  type CheckoutFormState,
  type FieldErrors,
} from "@/lib/checkout";
import {
  computeDeposit,
  PREORDER_PAYMENT_PROVIDER_ID,
} from "@/lib/preorder-checkout";
import { PreorderOrderSummary } from "./PreorderOrderSummary";

type ShippingOption = { id: string; name: string; amount: number };

export function PreorderCheckoutForm() {
  const { cart, clearCart } = useCart();
  const router = useRouter();

  const [state, setState] = useState<CheckoutFormState>(EMPTY_CHECKOUT_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cart?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getCartSdk("preorder").store.fulfillment.listCartOptions(
          { cart_id: cart.id },
        );
        if (cancelled) return;
        const opts = (r.shipping_options ?? []).map((o) => ({
          id: o.id,
          name: o.name ?? "",
          amount: o.amount ?? 0,
        }));
        setOptions(opts);
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart?.id]);

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return (
      <div className="rounded-xl border border-sage-200 bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          Your pre-order bag is empty.
        </p>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Browse the pre-order collection to reserve a piece.
        </p>
        <Link
          href="/preorder/products"
          className="mt-6 inline-block rounded-md bg-sage-500 px-7 py-3 font-sans text-sm font-semibold text-white hover:bg-sage-700"
        >
          Browse pre-orders
        </Link>
      </div>
    );
  }

  if (cartTypeOf(cart) !== "preorder") {
    return (
      <div className="rounded-xl border border-sage-200 bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          This is the pre-order checkout.
        </p>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Your bag holds in-stock items, which check out separately.
        </p>
        <Link
          href="/checkout"
          className="mt-6 inline-block font-sans text-sm font-semibold text-sage-700 hover:text-sage-900"
        >
          Go to the in-stock checkout →
        </Link>
      </div>
    );
  }

  async function handleSubmit() {
    const selected = options.find((o) => o.id === state.shippingOptionId);
    const deliveryMethod = selected
      ? shippingOptionToDeliveryMethod(selected.name)
      : null;

    const v = validateCheckout(state, deliveryMethod);
    if (Object.keys(v).length) {
      setErrors(v);
      setBanner("Please fix the highlighted fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!cart) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const sdk = getCartSdk("preorder");

      await sdk.store.cart.update(cart.id, {
        email: state.email,
        shipping_address: toMedusaAddress(state, "shipping", deliveryMethod),
        billing_address: toMedusaAddress(state, "billing", deliveryMethod),
        metadata: {
          ...(cart.metadata ?? {}),
          notes: state.notes?.trim() || undefined,
          delivery_method: selected?.name ?? null,
        },
      });

      await sdk.store.cart.addShippingMethod(cart.id, {
        option_id: state.shippingOptionId!,
      });

      await sdk.store.payment.initiatePaymentSession(cart, {
        provider_id: PREORDER_PAYMENT_PROVIDER_ID,
      });

      const result = await sdk.store.cart.complete(cart.id);
      if (result.type !== "order") {
        throw new Error(result.error?.message ?? "Order could not be completed");
      }

      const { deposit } = computeDeposit(
        cart.item_total ?? cart.subtotal ?? 0,
        cart.shipping_total ?? 0,
      );

      clearCart();
      router.push(
        `/preorder/checkout/success?order=${result.order.id}&deposit=${deposit}`,
      );
    } catch (err) {
      setBanner(
        err instanceof Error
          ? err.message
          : "Couldn't place your reservation. Please try again.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const currency = cart.currency_code ?? "MUR";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="grid gap-8 lg:grid-cols-[1fr_minmax(320px,380px)]"
    >
      <div className="min-w-0">
        {banner && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-coral-500 bg-coral-50 px-4 py-3 font-sans text-sm text-coral-700"
          >
            {banner}
          </div>
        )}

        <CheckoutFields
          state={state}
          errors={errors}
          accent="sage"
          onChange={(f, v) => setState((s) => ({ ...s, [f]: v }))}
          onBlur={() => {}}
        />

        <fieldset className="mt-8">
          <legend className="mb-3 font-display text-lg font-semibold text-ink">
            Delivery method
          </legend>
          {errors.shippingOptionId && (
            <p className="mb-2 font-sans text-[11px] text-coral-700">
              {errors.shippingOptionId}
            </p>
          )}
          <div className="space-y-2.5">
            {options.length === 0 ? (
              <p className="font-sans text-sm text-ink-muted">
                Loading delivery options…
              </p>
            ) : (
              options.map((o) => {
                const checked = state.shippingOptionId === o.id;
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border-[1.5px] bg-white px-4 py-3 transition-colors ${
                      checked ? "border-sage-500" : "border-sage-200"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingOption"
                        value={o.id}
                        checked={checked}
                        onChange={() =>
                          setState((s) => ({ ...s, shippingOptionId: o.id }))
                        }
                        className="h-4 w-4 accent-sage-500"
                      />
                      <span className="font-sans text-sm font-medium text-ink">
                        {o.name}
                      </span>
                    </span>
                    <span className="font-sans text-sm text-ink-soft">
                      {o.amount === 0 ? "Free" : formatPrice(o.amount, currency)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 flex w-full items-center justify-center rounded-md bg-sage-500 px-4 py-3 font-sans text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sage-700 disabled:opacity-60 lg:hidden"
        >
          {submitting ? "Placing reservation…" : "Place reservation"}
        </button>
      </div>

      <div>
        <PreorderOrderSummary cart={cart} />
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 hidden w-full items-center justify-center rounded-md bg-sage-500 px-4 py-3 font-sans text-sm font-semibold tracking-wide text-white transition-colors hover:bg-sage-700 disabled:opacity-60 lg:flex"
        >
          {submitting ? "Placing reservation…" : "Place reservation"}
        </button>
      </div>
    </form>
  );
}
