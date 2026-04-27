"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function CheckoutForm() {
  const { cart } = useCart();

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return (
      <div className="rounded-xl border border-blush-400 bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          Your bag is empty
        </p>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Add something beautiful before you check out.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-coral-500 px-7 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="font-sans text-sm text-ink-muted">Form coming up…</div>
      <div className="font-sans text-sm text-ink-muted">
        Order summary coming up…
      </div>
    </div>
  );
}
