import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How pre-order works",
  description:
    "How Doll Up Boutique's SHEIN pre-order works: 75% deposit reserves your piece, balance on arrival, ships in ~15–20 days.",
};

const STEPS = [
  {
    n: "01",
    title: "Pick your piece",
    body: "Browse the pre-order catalog, or paste a SHEIN link on the Request page if you've found something specific. We curate the catalog around what fits the Doll Up vibe.",
  },
  {
    n: "02",
    title: "Reserve with a 75% deposit",
    body: "Add to cart and check out as normal. You'll pay 75% of the all-in price via Juice transfer — this reserves the piece and lets us place the SHEIN order on your behalf.",
  },
  {
    n: "03",
    title: "We order within 7 days",
    body: "Once your deposit clears, we place the order at SHEIN. You'll get a confirmation on WhatsApp and a tracking note in your account.",
  },
  {
    n: "04",
    title: "Arrives in Mauritius in ~15–20 days",
    body: "Standard pre-order window. We track every batch — if anything slips, we tell you the same day rather than at the end.",
  },
  {
    n: "05",
    title: "Pay the balance, get it delivered",
    body: "When your piece lands in Mauritius, we WhatsApp you to confirm delivery. You pay the remaining 25% (cash, Juice or card) on arrival — same delivery network as the in-stock store, COD island-wide.",
  },
];

const FAQS = [
  {
    q: "Why a 75% deposit?",
    a: "We pay SHEIN upfront when we place the order. The deposit covers the product cost + shipping + customs so we can ship for you risk-free. The remaining 25% is our handling, paid only when the piece actually arrives in your hands.",
  },
  {
    q: "Can I cancel a pre-order?",
    a: "No — pre-order sales are final once the deposit is paid. We've already committed your order to SHEIN by that point. Pick carefully or use the Request page to ask questions before ordering.",
  },
  {
    q: "What if my size doesn't fit?",
    a: "SHEIN sizing varies by piece, so we publish the exact measurements on each product page. If you're between sizes, message us before ordering — we'd rather get it right than have you stuck with the wrong fit.",
  },
  {
    q: "What if SHEIN goes out of stock after my deposit?",
    a: "Rare, but it happens. If a piece becomes unavailable after we've placed the order, we'll refund your deposit in full (Juice transfer back) or swap it for any other in-stock or pre-order item.",
  },
  {
    q: "How does this differ from the in-stock store?",
    a: "The in-stock store ships from our warehouse in Mauritius the next day. Pre-order pieces are ordered fresh from SHEIN per customer — wider selection, but you wait ~15–20 days. Same delivery network, same support team.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="bg-cream">
      <section className="border-b border-sage-100 bg-gradient-to-b from-sage-50 to-cream">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
            How it works
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
            Five steps from SHEIN to your doorstep.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Pre-order is for pieces we don't stock locally. You wait a bit longer, but
            you get access to SHEIN's full catalog at one transparent, all-in price.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <ol className="space-y-5">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex gap-5 rounded-lg border border-sage-100 bg-white p-5"
            >
              <p className="font-display text-3xl leading-none text-sage-300">
                {step.n}
              </p>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/preorder/products"
            className="rounded-full bg-sage-700 px-5 py-3 text-[13px] font-semibold tracking-wide text-cream transition hover:bg-sage-900"
          >
            Browse pre-order catalog
          </Link>
          <Link
            href="/preorder/request"
            className="rounded-full border border-sage-300 px-5 py-3 text-[13px] font-medium tracking-wide text-sage-700 transition hover:bg-sage-100"
          >
            Request a SHEIN item →
          </Link>
        </div>
      </section>

      <section className="border-t border-sage-100 bg-sage-50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-display text-2xl text-ink">Common questions</h2>
          <dl className="mt-6 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-lg border border-sage-200 bg-white p-5">
                <dt className="text-[14px] font-semibold text-ink">{f.q}</dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
