// src/app/checkout/page.tsx
import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <h1 className="mb-8 font-display text-3xl font-semibold text-ink lg:text-4xl">
        Checkout
      </h1>
      <CheckoutForm />
    </div>
  );
}
