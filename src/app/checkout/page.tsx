// src/app/checkout/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CreditCard, LockKeyhole, Truck } from "lucide-react";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 lg:py-14">
      <div className="mb-7 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/shop"
            className="mb-4 inline-flex items-center gap-2 font-sans text-sm font-semibold text-ink-soft transition-colors hover:text-coral-500"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back to shop
          </Link>
          <h1 className="font-display text-3xl font-semibold text-ink lg:text-4xl">
            Checkout
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-muted">
            Review your bag, choose delivery, then place your order.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 font-sans text-[12px] text-ink-soft sm:flex-row lg:w-auto">
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-blush-300 bg-white px-3 py-2">
            <LockKeyhole aria-hidden className="h-4 w-4 text-coral-500" />
            Secure checkout
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-blush-300 bg-white px-3 py-2">
            <Truck aria-hidden className="h-4 w-4 text-coral-500" />
            Mauritius delivery
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-blush-300 bg-white px-3 py-2">
            <CreditCard aria-hidden className="h-4 w-4 text-coral-500" />
            Cash or Juice/bank
          </span>
        </div>
      </div>
      <CheckoutForm />
    </div>
  );
}
