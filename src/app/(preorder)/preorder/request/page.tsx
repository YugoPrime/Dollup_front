import Link from "next/link";
import type { Metadata } from "next";
import { PAYMENT_INFO } from "@/lib/payment-info";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Request a SHEIN item",
  description:
    "Send us a SHEIN link and we'll quote you the all-in pre-order price. Reserve with 75% deposit, balance on arrival.",
};

const WHATSAPP_TEMPLATE = encodeURIComponent(
  "Hi Doll Up! I'd like to request a SHEIN item for pre-order:\n\n" +
    "Link: \n" +
    "Size (if applicable): \n" +
    "Notes: ",
);
const WA_LINK = `https://wa.me/${PAYMENT_INFO.whatsapp_digits}?text=${WHATSAPP_TEMPLATE}`;

export default function PreorderRequestPage() {
  return (
    <main className="bg-cream">
      <section className="border-b border-sage-100 bg-gradient-to-b from-sage-50 to-cream">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
            Request a piece
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
            Found something on SHEIN? Send us the link.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            We'll quote you the all-in pre-order price within a few hours.
            If you're happy with it, reserve it with a 75% deposit and we'll
            place the SHEIN order on your behalf.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        {/* Phase 1: WhatsApp-only intake. The instant price preview + auto
            product creation lives in Phase 2 (SHEIN scraper). The card below
            sets that expectation honestly. */}
        <div className="rounded-lg border border-sage-200 bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
                Quickest way · while the website form is being built
              </p>
              <h2 className="mt-2 font-display text-2xl text-ink">
                Message us on WhatsApp
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                Paste your SHEIN link, your size, and any notes. We'll come back
                with the all-in price (product + shipping + customs + handling)
                and a deposit link.
              </p>
            </div>
            <span className="rounded-full bg-sage-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sage-700">
              Phase 1
            </span>
          </div>

          <a
            href={WA_LINK}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-sage-700 px-6 py-3 text-[14px] font-semibold tracking-wide text-cream transition hover:bg-sage-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.32-1.65a11.93 11.93 0 0 0 5.74 1.46h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.43zM12.07 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.46 4.45-9.9 9.91-9.9 2.65 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9zm5.43-7.4c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.48 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.3.17-1.41-.07-.12-.27-.2-.57-.35z" />
            </svg>
            Open WhatsApp with link template
          </a>

          <p className="mt-3 text-[12px] text-ink-muted">
            Or copy our number: <span className="font-mono text-ink">{PAYMENT_INFO.whatsapp}</span>
          </p>
        </div>

        {/* Coming soon — sets expectation for the scraper-powered version */}
        <div className="mt-6 rounded-lg border border-dashed border-sage-200 bg-sage-50 p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
            Coming soon
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink">
            Paste-the-link instant quotes
          </h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
            We're building an in-page form where you paste a SHEIN link and see
            the all-in price immediately — no waiting. If it works for you,
            you'll be able to add it straight to your cart from the same screen.
          </p>
        </div>

        {/* What we accept */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-sage-100 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage-700">
              What we can pre-order
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-ink-soft">
              <li>· Clothing, lingerie, swimwear, accessories on SHEIN MU/EU.</li>
              <li>· Items currently in stock at SHEIN (not their pre-orders).</li>
              <li>· Up to 5 pieces per pre-order request.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-sage-100 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              What we can't
            </p>
            <ul className="mt-3 space-y-2 text-[13px] text-ink-muted">
              <li>· Electronics, fragrances, restricted goods.</li>
              <li>· Items SHEIN flags as &ldquo;ships from overseas only&rdquo;.</li>
              <li>· Anything you need in less than 15 days — try the in-stock store.</li>
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
