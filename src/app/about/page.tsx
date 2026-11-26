import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { getStoreConfig } from "@/lib/store-config";
import { StatCountUp } from "./StatCountUp";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Doll Up Boutique is a small Mauritian boutique. Since 2018 we have picked dresses, lingerie and beachwear for every season and every festive moment.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Our Story",
    description:
      "Meet Doll Up Boutique, a Mauritian fashion boutique picking dresses, lingerie and beachwear since 2018.",
    url: "/about",
  },
};

const STATS = [
  { end: 8, label: "Years and counting" },
  { end: 20000, prefix: "+", format: "comma" as const, label: "Orders fulfilled" },
  { end: 10000, prefix: "+", format: "comma" as const, label: "Happy customers" },
];

export default async function AboutPage() {
  const cfg = await getStoreConfig();
  const freeOver = cfg.shipping.free_shipping_threshold_mur;

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-16 md:px-10 md:py-24">
        <div className="absolute right-[-100px] top-10 h-[260px] w-[260px] rounded-full bg-white/30 blur-3xl" aria-hidden />
        <div className="absolute bottom-[-80px] left-[-60px] h-[200px] w-[200px] rounded-full bg-coral-300/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-[900px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ Our story
          </p>
          <h1 className="font-display text-[40px] leading-[0.95] tracking-[-1px] text-ink md:text-[72px]">
            Dressing Mauritius{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
              since 2018.
            </em>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] font-sans text-[15px] leading-[1.55] text-ink-soft md:text-[16px]">
            Doll Up Boutique is a small Mauritian-run boutique. Since 2018 we&apos;ve picked dresses, lingerie and beachwear for the women of this island. We sell online and deliver to your door.
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
                We started in 2018 with no shop and no team, just one idea: bring the pieces you see online but can&apos;t find here to the women of Mauritius. No middleman markups, and no waiting weeks for an order to clear customs.
              </p>
              <p>
                We still sell online only, with no physical store: careful picks, fast delivery, and we listen to what our customers ask for.
              </p>
              <p>
                Every season we choose pieces ourselves from suppliers in <strong>China</strong>, <strong>Hong Kong</strong> and <strong>Thailand</strong>, picking what suits the Mauritian climate and our festive moments: beachwear when the heat hits, velvet and sequins for end-of-year parties, light layers for the cooler months.
              </p>
              <p>
                We&apos;re still small, on purpose. It keeps our selection tight and our service personal.
              </p>
            </div>
          </div>
          <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-blush-200 via-cream to-champagne-100 p-8 text-center">
            <div aria-hidden className="absolute inset-4 rounded-[20px] border border-champagne-gold/60" />
            <div className="relative">
              <span aria-hidden className="block text-[26px] leading-none text-champagne-gold">
                ★
              </span>
              <p className="mt-4 font-display text-[64px] leading-none text-ink md:text-[84px]">
                2018
              </p>
              <span aria-hidden className="mx-auto mt-5 block h-px w-14 bg-champagne-gold" />
              <p className="mt-4 font-display text-[20px] italic leading-tight text-coral-700 md:text-[24px]">
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
              The little things matter.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                k: "A small selection",
                v: "We don't carry thousands of styles. Each season we hand-pick a short list, so you're never lost in choice.",
              },
              {
                k: "Made for our weather",
                v: "Pieces that breathe in the Mauritian heat, layer for the cooler season, and shine for festive nights.",
              },
              {
                k: "Personal service",
                v: "Sizing advice on demand and next-day delivery when you order before the day's cutoff. We reply on WhatsApp, Instagram and email.",
              },
            ].map((c) => (
              <div
                key={c.k}
                className="rounded-2xl border border-blush-300 bg-cream p-7"
              >
                <h3 className="mb-2 font-display text-[22px] leading-[1.2] text-ink md:text-[24px]">
                  {c.k}
                </h3>
                <p
                  className="font-sans text-[14px] leading-[1.65] text-ink-soft md:text-[15px]"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.v) }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By the numbers: one panel, split by thin gold lines */}
      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1100px] rounded-3xl bg-ink px-8 py-4 text-white md:px-12 md:py-12">
          <div className="grid divide-y divide-champagne-gold/30 md:grid-cols-3 md:divide-x md:divide-y-0">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center py-7 text-center md:py-2">
                <p className="font-display text-[44px] leading-none md:text-[60px]">
                  <StatCountUp end={s.end} prefix={s.prefix} format={s.format} />
                </p>
                <p className="mt-3 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-champagne-gold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA: light band, so it doesn't stack with the coral newsletter band in the footer */}
      <section className="border-t border-champagne-gold/40 bg-blush-100 px-6 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-[800px] text-center">
          <h2 className="font-display text-[28px] leading-[1.1] text-ink md:text-[40px]">
            Come see what we&apos;ve picked{" "}
            <em className="not-italic text-coral-700" style={{ fontStyle: "italic" }}>
              this season.
            </em>
          </h2>
          {freeOver > 0 && (
            <p className="mx-auto mt-3 max-w-[520px] font-sans text-[14px] leading-[1.55] text-ink-soft">
              Free delivery on orders over {formatPrice(freeOver, "MUR")}.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-ink px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Shop the latest →
            </Link>
            <a
              href={cfg.store.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink bg-transparent px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Follow on Instagram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
