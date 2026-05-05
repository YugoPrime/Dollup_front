import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  getMauritiusRates,
  getRodriguesRate,
  type ShippingRate,
} from "@/lib/shipping-rates";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description:
    "How we deliver across Mauritius and Rodrigues — fees, timeframes, free-delivery threshold and pickup options.",
};

// Revalidate every 5 minutes so Medusa price changes flow through without a redeploy.
export const revalidate = 300;

function renderFee(rate: ShippingRate): React.ReactNode {
  if (rate.amount == null) return "—";
  if (rate.amount === 0) {
    return <strong className="text-coral-500">Free</strong>;
  }
  if (rate.freeOver != null) {
    return (
      <>
        <strong className="text-coral-500">
          Free over {formatPrice(rate.freeOver, rate.currency)}
        </strong>{" "}
        · otherwise {formatPrice(rate.amount, rate.currency)}
      </>
    );
  }
  return formatPrice(rate.amount, rate.currency);
}

export default async function ShippingPage() {
  const [muRates, rodriguesRate] = await Promise.all([
    getMauritiusRates(),
    getRodriguesRate(),
  ]);
  const homeRate = muRates.find((r) => r.key === "home");
  const freeOverLabel =
    homeRate?.freeOver != null
      ? formatPrice(homeRate.freeOver, homeRate.currency)
      : "Rs 1,500";
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Delivery info
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Shipping &amp;{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              delivery
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            Free delivery across Mauritius on orders over {freeOverLabel}. Order before 2pm for next-day delivery.
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-[1100px] gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-blush-300 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">Next-day in Mauritius</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              Order before 2pm and we ship the same day. Driver calls about an hour before arriving.
            </p>
          </div>
          <div className="rounded-2xl border border-blush-300 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">Free over {freeOverLabel}</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              Free home or office delivery in Mauritius once your basket crosses {freeOverLabel}.
            </p>
          </div>
          <div className="rounded-2xl border border-blush-300 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-coral-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2 className="mb-1 font-display text-[20px] leading-tight text-ink">Free pickup</h2>
            <p className="font-sans text-[13px] leading-[1.5] text-ink-soft">
              Skip delivery and pick up at our Pereybere point near Winners — no minimum order.
            </p>
          </div>
        </div>
      </section>

      {/* Mauritius rates */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ Mauritius
          </p>
          <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[40px]">
            Delivery in Mauritius
          </h2>

          <div className="mt-6 overflow-hidden rounded-2xl border border-blush-300">
            <table className="w-full text-left font-sans text-[13px] md:text-[14px]">
              <thead className="bg-blush-100 text-ink">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Method</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Fee</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Timeframe</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {muRates.map((rate, i) => (
                  <tr
                    key={rate.key}
                    className={
                      i % 2 === 1
                        ? "border-t border-blush-300 bg-cream"
                        : "border-t border-blush-300"
                    }
                  >
                    <td className="px-5 py-3 font-semibold text-ink">{rate.label}</td>
                    <td className="px-5 py-3">{renderFee(rate)}</td>
                    <td className="px-5 py-3">{rate.timeframe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-2 font-sans text-[13px] text-ink-soft md:text-[14px]">
            <li className="flex items-start gap-2">
              <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
              We deliver Monday to Saturday, no fixed time slots.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
              Driver gives you a call roughly one hour before arriving.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
              For Cash on Delivery, please keep your phone with you — we call twice and cancel if unanswered.
            </li>
          </ul>
        </div>
      </section>

      {/* Rodrigues */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ✦ Rodrigues
          </p>
          <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[40px]">
            Delivery to Rodrigues
          </h2>
          <p className="mt-4 max-w-[600px] font-sans text-[14px] leading-[1.55] text-ink-soft">
            We ship to Rodrigues by Mauritius Post. You&apos;ll collect your parcel from your nearest post office.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-blush-300 bg-white">
            <table className="w-full text-left font-sans text-[13px] md:text-[14px]">
              <thead className="bg-blush-100 text-ink">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Method</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Fee</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wide text-[11px]">Timeframe</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                <tr className="border-t border-blush-300">
                  <td className="px-5 py-3 font-semibold text-ink">{rodriguesRate.label}</td>
                  <td className="px-5 py-3">{renderFee(rodriguesRate)}</td>
                  <td className="px-5 py-3">{rodriguesRate.timeframe}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(229,96,74,0.05)] md:p-12">
          <h2 className="font-display text-[24px] leading-[1.2] text-ink md:text-[32px]">
            Question about a specific delivery?
          </h2>
          <p className="mx-auto mt-3 max-w-[440px] font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
            Already placed your order? Use the order tracker. Anything else, message us on WhatsApp.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/track-order"
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Track an order →
            </Link>
            <a
              href="https://wa.me/23059416359"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink bg-white px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Message on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
