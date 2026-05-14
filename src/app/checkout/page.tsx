// src/app/checkout/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 lg:py-14">
      <div className="mb-7 flex flex-col gap-3 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/shop"
            className="mb-4 inline-flex items-center gap-2 font-sans text-sm font-semibold text-ink-soft transition-colors hover:text-coral-500"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back to shop
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-3xl font-semibold text-ink lg:text-4xl">
              Checkout
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blush-300 bg-white px-2.5 py-1 font-sans text-[11px] font-medium text-ink-soft">
              <LockKeyhole aria-hidden className="h-3.5 w-3.5 text-coral-500" />
              Secure checkout
            </span>
          </div>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-muted">
            Review your bag, choose delivery, then place your order.
          </p>
        </div>
      </div>
      <CheckoutForm />
    </div>
  );
}
