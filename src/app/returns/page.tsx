import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Returns Policy",
  description:
    "Our return window, what we accept, what we don't, and how to start a return — clearly explained.",
  alternates: { canonical: "/returns" },
  openGraph: {
    title: "Refund & Returns Policy",
    description: "Return window, accepted items and how to start a Doll Up Boutique return.",
    url: "/returns",
  },
};

export default function ReturnsPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Easy returns
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Refund &amp;{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              returns
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            15 days to change your mind on in-stock items. Tell us first, then post it back — we&apos;ll take care of the rest.
          </p>
        </div>
      </section>

      {/* Window + key rules */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-[1100px] gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-blush-300 bg-white p-7">
            <div className="mb-3 inline-flex h-10 items-center justify-center rounded-full bg-coral-500 px-4 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              15 days
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">Return window</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              You have 15 days from receiving your order to contact us about a return.
            </p>
          </div>
          <div className="rounded-2xl border border-blush-300 bg-white p-7">
            <div className="mb-3 inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              24 hours
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">If it arrives damaged</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              Send photos within 24h of delivery so we can replace, exchange or refund.
            </p>
          </div>
          <div className="rounded-2xl border border-blush-300 bg-white p-7">
            <div className="mb-3 inline-flex h-10 items-center justify-center rounded-full bg-coral-500 px-4 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              Rs 70
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">Return shipping</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              Flat Rs 70 by Mauritius Post — paid by you. Original delivery fees are non-refundable.
            </p>
          </div>
        </div>
      </section>

      {/* What we accept / don't accept */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-coral-300 bg-blush-100 p-7">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-700">
              ✓ We accept
            </p>
            <h2 className="mb-4 font-display text-[24px] leading-[1.1] text-ink md:text-[28px]">
              Returnable items
            </h2>
            <ul className="space-y-2.5 font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
              <li className="flex items-start gap-2">
                <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Unworn and unwashed
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                With original tags and packaging
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Damaged or defective items (within 24h of delivery)
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-blush-400 bg-cream p-7">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              ✕ We don&apos;t accept
            </p>
            <h2 className="mb-4 font-display text-[24px] leading-[1.1] text-ink md:text-[28px]">
              Final-sale items
            </h2>
            <p className="mb-3 font-sans text-[12px] text-ink-muted">
              For hygiene reasons we cannot accept returns or exchanges on:
            </p>
            <ul className="space-y-2 font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
              <li className="flex items-start gap-2"><span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />Lingerie, bras and bralettes</li>
              <li className="flex items-start gap-2"><span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />Panties and bodysuits</li>
              <li className="flex items-start gap-2"><span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />Swimwear and bikinis</li>
              <li className="flex items-start gap-2"><span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />Free gifts and items marked non-returnable</li>
              <li className="flex items-start gap-2"><span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />Items returned worn, washed or with damaged packaging</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to return */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ Step by step
          </p>
          <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[40px]">
            How to return an item
          </h2>

          <ol className="mt-8 space-y-5">
            {[
              {
                t: "Contact us first",
                d: (
                  <>
                    Message us on{" "}
                    <a href="https://wa.me/23059416359" target="_blank" rel="noreferrer" className="text-coral-500 hover:underline">
                      WhatsApp
                    </a>{" "}
                    or email{" "}
                    <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">
                      hello@dollupboutique.com
                    </a>{" "}
                    with your order number, the item, and the reason. We&apos;ll confirm the return is eligible and tell you what to do next.
                  </>
                ),
              },
              {
                t: "Pack it back up",
                d: "Repack the item in its original packaging with all tags still attached. Add a note inside with your order number so we can match it on arrival.",
              },
              {
                t: "Send it via Mauritius Post",
                d: "Flat-rate Rs 70 by Mauritius Post. Keep the tracking receipt — we'll need it if anything goes missing in transit.",
              },
              {
                t: "We process the refund",
                d: "Once we receive and check the item, we refund within 30 days using the same payment method you used to order. Original shipping fees are non-refundable.",
              },
            ].map((s, i) => (
              <li key={i} className="flex gap-5 rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(229,96,74,0.04)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[17px] text-white">
                  {i + 1}
                </div>
                <div>
                  <h3 className="mb-1 font-display text-[19px] leading-tight text-ink">{s.t}</h3>
                  <p className="font-sans text-[13px] leading-[1.6] text-ink-soft md:text-[14px]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Exchange note */}
      <section className="bg-white px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] rounded-2xl border border-blush-300 bg-cream p-7 md:p-10">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            Note
          </p>
          <h2 className="mb-3 font-display text-[22px] leading-[1.2] text-ink md:text-[28px]">
            Exchanges
          </h2>
          <p className="font-sans text-[14px] leading-[1.6] text-ink-soft">
            Exchanges are possible on selected products only — a Rs 150 fee applies to cover redelivery. Get in touch first and we&apos;ll let you know if the piece can be exchanged or if a return + new order is the better path.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] text-center">
          <h2 className="font-display text-[24px] leading-[1.2] text-ink md:text-[32px]">
            Ready to start a return?
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
            Have your order number ready and tell us which piece you&apos;d like to return.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/23059416359"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Start on WhatsApp →
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-ink bg-white px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Other contact options
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
