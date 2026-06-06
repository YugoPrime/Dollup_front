import Link from "next/link";
import type { Metadata } from "next";
import { PreorderQuoteBox } from "@/components/preorder/PreorderQuoteBox";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Request a SHEIN item",
  description:
    "Type a SHEIN item's price and see your all-in Mauritius pre-order price instantly. Reserve with 75% deposit, balance on arrival.",
};

export default function PreorderRequestPage() {
  return (
    <main className="bg-cream">
      <section className="border-b border-sage-100 bg-gradient-to-b from-sage-50 to-cream">
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-10 md:pt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
            Request a piece
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] text-ink md:text-5xl">
            Found something on SHEIN?
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Check the all-in Mauritius price in seconds — shipping, customs and
            handling included. Like it? Send the link, reserve with a 75%
            deposit, and we&rsquo;ll order it for you.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-sage-700">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>✓</span> One transparent price
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>✓</span> ~15–20 day delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>✓</span> 75% deposit to reserve
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 md:py-12">
        <PreorderQuoteBox />

        {/* What we accept */}
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-sage-100 bg-white p-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
              <span aria-hidden className="text-sage-500">✓</span>
              What we can pre-order
            </p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-soft">
              <li className="flex gap-2"><span aria-hidden className="text-sage-300">—</span>Clothing, lingerie, swimwear, accessories on SHEIN MU/EU.</li>
              <li className="flex gap-2"><span aria-hidden className="text-sage-300">—</span>Items currently in stock at SHEIN (not their pre-orders).</li>
              <li className="flex gap-2"><span aria-hidden className="text-sage-300">—</span>Up to 5 pieces per pre-order request.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-sage-100 bg-white p-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <span aria-hidden className="text-coral-400">✕</span>
              What we can&rsquo;t
            </p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li className="flex gap-2"><span aria-hidden className="text-blush-400">—</span>Electronics, fragrances, restricted goods.</li>
              <li className="flex gap-2"><span aria-hidden className="text-blush-400">—</span>Items SHEIN flags as &ldquo;ships from overseas only&rdquo;.</li>
              <li className="flex gap-2"><span aria-hidden className="text-blush-400">—</span>Anything you need in under 15 days — try the in-stock store.</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 text-center text-[13px] text-ink-muted">
          Looking for something we already have?{" "}
          <Link href="/preorder/products" className="text-sage-700 hover:underline">
            Browse the catalog
          </Link>
          {" "}or{" "}
          <a href="https://dollupboutique.com" className="text-sage-700 hover:underline">
            shop in-stock
          </a>.
        </div>
      </section>
    </main>
  );
}
