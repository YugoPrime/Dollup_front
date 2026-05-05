import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the questions our customers ask most — orders, payment, sizing, delivery, returns and more.",
};

type QA = { q: string; a: React.ReactNode };
type FaqSection = { id: string; title: string; items: QA[] };

const SECTIONS: FaqSection[] = [
  {
    id: "ordering",
    title: "Ordering",
    items: [
      {
        q: "How can I place an order?",
        a: (
          <>
            <p className="mb-2">
              The fastest way is to order directly on the website. You can also place orders via Instagram, Facebook or WhatsApp DMs.
            </p>
            <p>To order online:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Pick the item, choose your colour and size carefully, and add to bag.</li>
              <li>Open your bag and click <strong>Checkout</strong>.</li>
              <li>Fill in your delivery details, accept the terms and place the order.</li>
              <li>Choose home delivery or pickup at Pereybere.</li>
              <li>For pre-orders, send your proof of payment (down payment) by email with your order number.</li>
              <li>You&apos;ll receive an order confirmation once stock is verified.</li>
            </ol>
          </>
        ),
      },
      {
        q: "Can I modify my order after checkout?",
        a: (
          <p>
            Yes — message us on WhatsApp <a href="https://wa.me/23059416359" target="_blank" rel="noreferrer" className="text-coral-500 hover:underline">+230 5941 6359</a> within 24 hours of checkout, with your order number. After that the order moves to packing and changes get tricky.
          </p>
        ),
      },
      {
        q: "How do I track my order?",
        a: (
          <p>
            Use the <Link href="/track-order" className="text-coral-500 hover:underline">Track Order</Link> page with your order ID and the phone number you used at checkout. We&apos;ll show you each step — placed, confirmed, packed, shipped, delivered.
          </p>
        ),
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    items: [
      {
        q: "How can I pay?",
        a: (
          <p>
            We accept <strong>Juice</strong>, <strong>bank transfer</strong>, <strong>myT Money</strong> and <strong>cash on delivery</strong>. Card payments are coming soon.
          </p>
        ),
      },
      {
        q: "Which currency do you accept?",
        a: (
          <p>
            Mauritian Rupees (MUR) only at the moment. Reunion Island shipping is paused — when it resumes you&apos;ll be able to pay in Euros.
          </p>
        ),
      },
      {
        q: "Do prices include VAT?",
        a: (
          <p>
            Yes — every price on the site is shown all-taxes-included (VAT). What you see is what you pay (plus delivery if applicable).
          </p>
        ),
      },
    ],
  },
  {
    id: "sizing",
    title: "Sizing",
    items: [
      {
        q: "How do I know my size?",
        a: (
          <p>
            Each product has its own size chart inside the <strong>Size Chart</strong> accordion on the product page (just under the price). Charts vary between dresses, lingerie and beachwear, so always check the one on the actual piece. Between two sizes? Message us — we&apos;ll guide you.
          </p>
        ),
      },
      {
        q: "Where is your stock from?",
        a: (
          <p>
            Our pieces come from China, Hong Kong and Thailand. We curate carefully each season for the Mauritian climate and festive moments — not every drop ends up on the site.
          </p>
        ),
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    items: [
      {
        q: "Where do you deliver?",
        a: (
          <p>
            All of Mauritius (home and office delivery, plus post) and Rodrigues (post only). See the <Link href="/shipping" className="text-coral-500 hover:underline">Shipping page</Link> for full details and fees.
          </p>
        ),
      },
      {
        q: "What are your delivery hours?",
        a: (
          <p>
            We deliver Monday to Saturday — no fixed time slots. The driver gives you a call about an hour before arriving so you can plan around it.
          </p>
        ),
      },
      {
        q: "How fast is delivery?",
        a: (
          <p>
            In-stock items: <strong>next-day</strong> if you order before 2pm. Pre-order items: <strong>12 to 18 days</strong> from order date.
          </p>
        ),
      },
      {
        q: "Is delivery free?",
        a: (
          <p>
            Free home/office delivery on orders <strong>above Rs 1,500</strong> in Mauritius. Below that, Rs 150 for home delivery, Rs 60 by post or Rs 90 express post.
          </p>
        ),
      },
    ],
  },
  {
    id: "returns",
    title: "Returns",
    items: [
      {
        q: "Can I return an item?",
        a: (
          <p>
            Yes — for in-stock items only. Contact us within <strong>15 days</strong> of receiving your order. For full conditions see our <Link href="/returns" className="text-coral-500 hover:underline">Returns Policy</Link>.
          </p>
        ),
      },
      {
        q: "What can&apos;t be returned?",
        a: (
          <p>
            For hygiene reasons we cannot accept returns on lingerie, bras, panties, bodysuits, swimwear, bikinis, pre-orders or items marked non-returnable. Free gifts are also non-returnable.
          </p>
        ),
      },
      {
        q: "What if my item arrives damaged?",
        a: (
          <p>
            Send us photos and a message <strong>within 24 hours of delivery</strong>. We&apos;ll replace, exchange or refund — whatever you prefer.
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Help centre
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Frequently asked{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              questions
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            Everything you might wonder before buying — and a few things you might wonder after.
          </p>
        </div>
      </section>

      {/* Jump-nav */}
      <section className="border-b border-blush-300 bg-white px-6 py-4 md:px-10">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-2.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-blush-300 bg-cream px-4 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-coral-500 hover:bg-coral-500 hover:text-white"
            >
              {s.title}
            </a>
          ))}
        </div>
      </section>

      {/* Sections */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px] space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <p className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
                ✦
              </p>
              <h2 className="mb-6 font-display text-[28px] leading-[1.05] text-ink md:text-[36px]">
                {s.title}
              </h2>
              <dl className="space-y-5">
                {s.items.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-blush-300 bg-white p-6 shadow-[0_1px_3px_rgba(229,96,74,0.04)]"
                  >
                    <dt className="font-display text-[17px] leading-snug text-ink md:text-[19px]">
                      {item.q}
                    </dt>
                    <dd className="mt-2 font-sans text-[13px] leading-[1.65] text-ink-soft md:text-[14px]">
                      {item.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[700px] text-center">
          <h2 className="font-display text-[24px] leading-[1.2] text-ink md:text-[32px]">
            Didn&apos;t find your answer?
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
            We&apos;re a real human team — message us on WhatsApp and we&apos;ll get back to you within a few hours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/23059416359"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Message on WhatsApp →
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-ink bg-white px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              All contact options
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
