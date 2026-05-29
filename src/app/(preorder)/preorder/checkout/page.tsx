import type { Metadata } from "next";
import { PreorderCheckoutForm } from "./PreorderCheckoutForm";

export const metadata: Metadata = {
  title: "Pre-order checkout",
  robots: { index: false, follow: false },
};

export default function PreorderCheckoutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 lg:py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-sage-900 lg:text-4xl">
          Reserve your pieces
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-muted">
          Pre-orders are sourced just for you. Pay a 75% deposit now to secure
          your pieces; the balance is settled on arrival. Expect delivery in
          about 15–20 days.
        </p>
      </div>
      <PreorderCheckoutForm />
    </main>
  );
}
