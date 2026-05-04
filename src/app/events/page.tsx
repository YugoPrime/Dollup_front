import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Events & Giveaways",
  description:
    "Doll Up Boutique giveaways, mystery boxes and seasonal happenings — exclusive perks for our community.",
};

export default function EventsPage() {
  return (
    <main className="bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Doll Up happenings
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[64px]">
            Events &amp;
            <br />
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              Giveaways
            </em>
          </h1>
          <p className="mx-auto mt-5 max-w-[480px] font-sans text-[14px] leading-[1.55] text-ink-soft md:text-[15px]">
            Free goodies, mystery boxes and member-only drops. Follow us on Instagram so you never miss one.
          </p>
        </div>
      </section>

      {/* Giveaway block */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="rounded-2xl bg-white p-8 shadow-[0_4px_16px_rgba(229,96,74,0.08)] md:p-10">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ This month
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[36px]">
              Win a <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>full outfit</em> on us
            </h2>
            <p className="mt-4 font-sans text-[14px] leading-[1.55] text-ink-soft">
              Every month we pick one customer to win a complete outfit of their choice from the latest drop. Worth up to Rs 4,000.
            </p>
            <ul className="mt-5 space-y-2.5 font-sans text-[13px] text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Follow <a href="https://www.instagram.com/dollupboutique/" target="_blank" rel="noreferrer" className="text-coral-500 hover:underline">@dollupboutique</a>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Tag 2 friends in the giveaway post
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
                Repost to your story for an extra entry
              </li>
            </ul>
            <a
              href="https://www.instagram.com/dollupboutique/"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-block rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Enter on Instagram →
            </a>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-coral-300 via-blush-300 to-blush-100">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="mb-3 text-[60px] leading-none text-white opacity-90">★</span>
              <p className="font-display text-[28px] leading-[1.1] text-white md:text-[36px]">
                Rs 4,000
                <br />
                <span className="font-sans text-[12px] font-bold uppercase tracking-[0.2em] opacity-90">
                  in store credit
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mystery Box */}
      <section className="bg-ink px-6 py-14 text-white md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-coral-700 via-coral-500 to-coral-300 md:order-2">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="mb-2 text-[80px] leading-none text-white opacity-95">🎁</span>
              <p className="font-display text-[36px] leading-[1.05] text-white md:text-[48px]">
                Mystery
                <br />
                <em className="not-italic text-white/90" style={{ fontStyle: "italic" }}>Box</em>
              </p>
              <p className="mt-3 font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-white/90">
                5 pieces · Rs 3,500
              </p>
            </div>
          </div>
          <div className="md:order-1">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
              ✦ Limited concept
            </p>
            <h2 className="font-display text-[30px] leading-[1.05] md:text-[40px]">
              Spin the wheel.
              <br />
              <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
                Trust the drop.
              </em>
            </h2>
            <p className="mt-4 max-w-[460px] font-sans text-[14px] leading-[1.55] text-white/80">
              Pick your size. Spin our mystery wheel. We curate <strong className="text-white">5 surprise pieces</strong> from our collection — yours for a flat <strong className="text-white">Rs 3,500</strong>. Always more value than the price tag, every time.
            </p>
            <ul className="mt-5 space-y-2.5 font-sans text-[13px] text-white/80">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-300" />
                3 spins per day so you can find a combo you love
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-300" />
                Confirm any spin to lock in your box
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-coral-300" />
                Free delivery + COD across Mauritius
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full bg-coral-500/20 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-300">
                Coming soon — DM to pre-order
              </span>
              <a
                href="https://www.instagram.com/dollupboutique/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/30 bg-white/5 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-ink"
              >
                DM us on Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="font-display text-[22px] leading-[1.3] text-ink md:text-[26px]">
            Want to be the first to know about new events &amp; drops?
          </p>
          <Link
            href="/loyalty"
            className="mt-5 inline-block rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
          >
            Join Doll Rewards →
          </Link>
        </div>
      </section>
    </main>
  );
}
