import type { Metadata } from "next";
import Link from "next/link";
import {
  Gift,
  Tag,
  ShoppingBag,
  Sparkles,
  Ticket,
  Package,
  Layers,
  Shirt,
} from "lucide-react";
import { AnniversaryCountdown } from "./AnniversaryCountdown";

export const metadata: Metadata = {
  title: "8 Years of Doll Up — Anniversary Sale",
  description:
    "Celebrating 8 years of Doll Up Boutique. Up to 50% off, free gifts, bundle deals and a Rs 2,000 prize draw. Jul 17–31, Mauritius only.",
  alternates: { canonical: "/events/anniversary" },
  openGraph: {
    title: "8 Years of Doll Up — Anniversary Sale",
    description:
      "Up to 50% off, free gifts, bundle deals and a Rs 2,000 prize draw. Jul 17–31.",
    url: "/events/anniversary",
  },
};

// Sale window + prize draw are date-sensitive; never serve a stale cached shell.
export const dynamic = "force-dynamic";

type Offer = {
  icon: typeof Gift;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
  tag?: string;
};

const OFFERS: Offer[] = [
  {
    icon: Tag,
    title: "Up to 50% Off",
    desc: "Shop the anniversary sale across the store.",
    href: "/shop?on_sale=1",
    cta: "Shop the sale",
  },
  {
    icon: Gift,
    title: "Free Gift",
    desc: "Buy 2 lingerie pieces, get a free cuff.",
    href: "/shop?category=intimates",
    cta: "Shop lingerie",
  },
  {
    icon: Sparkles,
    title: "Buy 1 Get 1 Free",
    desc: "Boob tape — Jul 25–27 only.",
    tag: "Jul 25–27",
  },
  {
    icon: Layers,
    title: "Pick Any 3",
    desc: "Bundle & save with one flat price.",
  },
  {
    icon: Shirt,
    title: "Pick Any 3 Dresses",
    desc: "Mix & match dresses — Jul 21–27 only.",
    tag: "Jul 21–27",
  },
  {
    icon: Package,
    title: "Mystery Box",
    desc: "5 surprise pieces for Rs 3,500.",
    href: "/events/mystery-box",
    cta: "Open a box",
  },
];

export default function AnniversaryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-blush-100 to-cream text-ink">
      <div className="mx-auto max-w-[1180px] px-6 py-10 md:px-10 md:py-16">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-blush-400 bg-cream-50 px-6 py-14 text-center shadow-[0_16px_60px_rgba(26,18,18,0.08)] md:px-10 md:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-[280px] w-[280px] rounded-full bg-gold/20 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-[260px] w-[260px] rounded-full bg-coral-500/15 blur-2xl"
          />

          <div className="relative">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Est. July 2018
            </p>

            <h1 className="mx-auto max-w-[720px] font-display text-[44px] leading-[0.98] text-ink md:text-[72px]">
              8 Years of Doll Up{" "}
              <span role="img" aria-label="birthday cake">
                🎂
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[560px] font-sans text-[15px] leading-[1.6] text-ink-soft md:text-[17px]">
              Eight years of dressing the babes of Mauritius — and it&apos;s all
              thanks to you. To celebrate, we&apos;re throwing our biggest party
              yet.
            </p>

            <p className="mx-auto mt-6 inline-block rounded-full bg-coral-500 px-6 py-2.5 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_4px_14px_rgba(229,96,74,0.3)] md:text-[14px]">
              Up to 50% Off — Jul 17–31
            </p>

            <div className="mt-9 flex justify-center">
              <Link
                href="/shop?on_sale=1"
                className="rounded-full bg-ink px-8 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 md:text-[13px]"
              >
                Shop the Sale
              </Link>
            </div>
          </div>
        </section>

        {/* COUNTDOWN */}
        <section className="mt-12 text-center md:mt-16">
          <p className="mb-5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-coral-500">
            Sale ends in
          </p>
          <AnniversaryCountdown />
        </section>

        {/* OFFER TILES */}
        <section className="mt-14 md:mt-20">
          <div className="mb-8 text-center">
            <h2 className="font-display text-[32px] leading-tight text-ink md:text-[42px]">
              The Birthday Line-up
            </h2>
            <p className="mt-2 font-sans text-[13px] text-ink-muted md:text-[14px]">
              Every offer running through the celebration.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((offer) => {
              const Icon = offer.icon;
              const card = (
                <div className="group flex h-full flex-col rounded-2xl border border-blush-400 bg-cream-50 p-6 shadow-[0_8px_28px_rgba(26,18,18,0.06)] transition-colors hover:border-coral-500 md:p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-blush-100 text-coral-500 transition-colors group-hover:bg-coral-500 group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {offer.tag ? (
                      <span className="rounded-full bg-gold/15 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-gold">
                        {offer.tag}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-5 font-display text-[24px] leading-tight text-ink md:text-[26px]">
                    {offer.title}
                  </h3>
                  <p className="mt-2 flex-1 font-sans text-[13px] leading-[1.55] text-ink-soft md:text-[14px]">
                    {offer.desc}
                  </p>
                  {offer.cta ? (
                    <span className="mt-5 inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors group-hover:text-coral-700">
                      {offer.cta}
                      <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              );

              return offer.href ? (
                <Link
                  key={offer.title}
                  href={offer.href}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 rounded-2xl"
                >
                  {card}
                </Link>
              ) : (
                <div key={offer.title} className="h-full">
                  {card}
                </div>
              );
            })}
          </div>
        </section>

        {/* PRIZE DRAW */}
        <section className="mt-14 md:mt-20">
          <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/15 via-cream-50 to-blush-100 px-6 py-12 text-center shadow-[0_12px_40px_rgba(212,168,83,0.18)] md:px-12 md:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-[200px] w-[200px] rounded-full bg-gold/25 blur-2xl"
            />
            <div className="relative mx-auto max-w-[640px]">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-white shadow-[0_6px_18px_rgba(212,168,83,0.4)]">
                <Ticket className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Anniversary Prize Draw
              </p>
              <h2 className="mt-3 font-display text-[34px] leading-[1.02] text-ink md:text-[46px]">
                Win a Rs 2,000 Voucher
              </h2>
              <p className="mx-auto mt-4 max-w-[520px] font-sans text-[14px] leading-[1.6] text-ink-soft md:text-[15px]">
                Every website order during the sale = 1 entry. One winner takes a
                Rs 2,000 voucher. Drawn Aug 1. Free entry with any purchase.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/shop?on_sale=1"
                  className="rounded-full bg-gold px-8 py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:brightness-95 md:text-[13px]"
                >
                  Enter — Shop Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER NOTE */}
        <p className="mt-12 text-center font-sans text-[11px] leading-[1.6] text-ink-muted md:mt-16">
          Toys excluded from sale. Mauritius only. Prices in MUR.
        </p>
      </div>
    </div>
  );
}
