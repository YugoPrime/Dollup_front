import type { Metadata } from "next";
import Link from "next/link";
import { sanitizeRichText } from "@/lib/sanitize-html";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Doll Up Boutique — a small Mauritian fashion house since 2018, curating dresses, lingerie and beachwear for every season and every festive moment.",
};

export default function AboutPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-16 md:px-10 md:py-24">
        <div className="absolute right-[-100px] top-10 h-[260px] w-[260px] rounded-full bg-white/30 blur-3xl" aria-hidden />
        <div className="absolute bottom-[-80px] left-[-60px] h-[200px] w-[200px] rounded-full bg-coral-300/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Made in Mauritius · since 2018
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[72px]">
            Small island.{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              Big wardrobe energy.
            </em>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] font-sans text-[15px] leading-[1.55] text-ink-soft md:text-[16px]">
            Doll Up Boutique is a small Mauritian-run fashion house. We&apos;ve been curating dresses, lingerie and beachwear for the women of this island since 2018 — and we&apos;re still here, drop after drop.
          </p>
        </div>
      </section>

      {/* Founding story */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ How it started
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
              From a phone, a few photos, a lot of DMs.
            </h2>
            <div className="mt-5 space-y-4 font-sans text-[14px] leading-[1.7] text-ink-soft md:text-[15px]">
              <p>
                We started in 2018 with no shop, no team, and one simple idea: bring carefully chosen pieces — the kind you usually see online but can never actually find here — to the women of Mauritius. No middle-men markups, no waiting weeks for an order to clear customs.
              </p>
              <p>
                Years later, the formula hasn&apos;t really changed. We curate every season ourselves from suppliers in <strong>China</strong>, <strong>Hong Kong</strong> and <strong>Thailand</strong>, picking what fits the Mauritian climate and our festive moments — beachwear when the heat hits, velvet and sequins for end-of-year parties, light layers for the cooler months.
              </p>
              <p>
                We&apos;re still small. That&apos;s on purpose — it&apos;s how we keep the curation tight and the service personal. When you DM us, you&apos;re messaging an actual person, not a chatbot.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-coral-300 via-blush-300 to-blush-100">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="mb-2 text-[80px] leading-none text-white/95">★</span>
              <p className="font-display text-[42px] leading-none text-white md:text-[60px]">
                2018
              </p>
              <p className="mt-2 font-sans text-[12px] font-bold uppercase tracking-[0.2em] text-white/90">
                The year it all began
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we stand for */}
      <section className="bg-white px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
              ✦ What we&apos;re about
            </p>
            <h2 className="font-display text-[28px] leading-[1.05] text-ink md:text-[42px]">
              Small details. Big difference.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                k: "Curated, not crowded",
                v: "We don&apos;t carry thousands of styles. Each season we hand-pick a tight edit so you&apos;re never lost in choice.",
              },
              {
                k: "Made for our weather",
                v: "Pieces that breathe in the Mauritian heat, layer for the cooler season, and shine for festive nights.",
              },
              {
                k: "Service that&apos;s personal",
                v: "Real humans on WhatsApp and Instagram, sizing advice on demand, and next-day delivery when you order before 2pm.",
              },
            ].map((c) => (
              <div
                key={c.k}
                className="rounded-2xl border border-blush-300 bg-cream p-7"
              >
                <h3 className="mb-2 font-display text-[20px] leading-tight text-ink">
                  {c.k}
                </h3>
                <p
                  className="font-sans text-[13px] leading-[1.6] text-ink-soft"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.v) }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By the numbers / proof */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-5 md:grid-cols-4">
          {[
            { n: "8 years", l: "and counting" },
            { n: "3 sources", l: "China · HK · Thailand" },
            { n: "1 island", l: "next-day delivered" },
            { n: "DMs open", l: "we actually reply" },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl bg-ink p-7 text-white"
            >
              <p className="font-display text-[28px] leading-tight md:text-[36px]">
                {s.n}
              </p>
              <p className="mt-1 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-coral-300">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-coral-500 px-6 py-14 text-white md:px-10 md:py-20">
        <div className="mx-auto max-w-[800px] text-center">
          <h2 className="font-display text-[28px] leading-[1.1] md:text-[40px]">
            Come see what we&apos;ve picked this season.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] font-sans text-[14px] leading-[1.55] text-white/90">
            New drops weekly. Free delivery on orders over Rs 1,500.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-white px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-ink hover:text-white"
            >
              Shop the latest →
            </Link>
            <a
              href="https://www.instagram.com/dollupboutique/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/40 bg-white/5 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-coral-500"
            >
              Follow on Instagram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
