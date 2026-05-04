import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";

type Product = HttpTypes.StoreProduct;

/**
 * Bento mosaic hero — 5 portrait tiles, varied sizes, synchronized float animation.
 * Each tile is a clickable Link to the product's PDP.
 * No badges, no prices, no overlays — the photo speaks for itself.
 *
 * Layout:
 *   ┌─────────┬───┬───┐
 *   │         │ T │ T │
 *   │ FEATURE ├───┼───┤
 *   │         │ T │ T │
 *   └─────────┴───┴───┘
 *
 * Animation: each tile floats up/down on a 6s cycle, staggered by 0.5s.
 * Wrapped in @media (prefers-reduced-motion: no-preference) so OS-level
 * reduce-motion users see static tiles.
 */
export function HeroBento({ products }: { products: Product[] }) {
  if (products.length < 3) return null; // bail rather than render a thin hero

  const [feature, ...rest] = products;
  const stacked = rest.slice(0, 4);

  const tile = (p: Product, key: string, ratio: string, animClass: string) => {
    const img = p.thumbnail ?? p.images?.[0]?.url;
    return (
      <Link
        key={`${key}-${p.id}`}
        href={`/products/${p.handle}`}
        className={`hero-bento-tile ${animClass} group relative block overflow-hidden rounded-xl bg-blush-100 shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(229,96,74,0.22)]`}
        style={{ aspectRatio: ratio }}
      >
        {img && (
          <Image
            src={img}
            alt={p.title}
            fill
            sizes={
              key === "feature"
                ? "(max-width: 768px) 60vw, 30vw"
                : "(max-width: 768px) 30vw, 12vw"
            }
            className="object-cover object-top"
            priority={key === "feature"}
          />
        )}
      </Link>
    );
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0]">
      <div className="absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full bg-white/45" aria-hidden />
      <div className="absolute -bottom-8 -left-8 h-[120px] w-[120px] rounded-full bg-coral-500/15" aria-hidden />
      <span className="absolute right-20 top-12 font-display text-[22px] text-coral-500" style={{ transform: "rotate(15deg)" }} aria-hidden>✦</span>

      <div className="relative mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:px-10 md:py-16">
        {/* Text column */}
        <div>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-3.5">
            ★ This week&apos;s drop
          </p>
          <h1 className="font-display text-[44px] leading-[0.92] tracking-[-1.5px] text-ink md:text-[72px]">
            Doll up,
            <br />
            <em className="text-coral-500">babe.</em>
          </h1>
          <p className="mt-4 max-w-[380px] font-sans text-[14px] leading-[1.5] text-ink-soft">
            Mauritius-curated dresses, lingerie &amp; beachwear. Cash on delivery available island-wide.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop?sort=new"
              className="rounded-full bg-ink px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              Shop new arrivals →
            </Link>
            <Link
              href="/shop?on_sale=1"
              className="rounded-full border-2 border-ink bg-white/85 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink backdrop-blur transition-colors hover:border-coral-500 hover:bg-coral-500 hover:text-white"
            >
              Browse sale
            </Link>
          </div>
        </div>

        {/* Mosaic column — desktop only; mobile uses a simpler 3-tile strip below */}
        <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1fr] md:gap-3">
          <div className="row-span-2 flex">
            {tile(feature, "feature", "2 / 3.2", "anim-1")}
          </div>
          <div className="flex flex-col gap-3">
            {stacked[0] && tile(stacked[0], "s0", "3 / 4", "anim-2")}
            {stacked[1] && tile(stacked[1], "s1", "3 / 4", "anim-3")}
          </div>
          <div className="flex flex-col gap-3">
            {stacked[2] && tile(stacked[2], "s2", "3 / 4", "anim-4")}
            {stacked[3] && tile(stacked[3], "s3", "3 / 4", "anim-5")}
          </div>
        </div>

        {/* Mobile mosaic — 3-tile strip with badges/prices visible (more direct on mobile) */}
        <div className="grid grid-cols-3 gap-1.5 md:hidden">
          {[feature, stacked[0], stacked[1]].filter(Boolean).map((p, i) => {
            const img = p!.thumbnail ?? p!.images?.[0]?.url;
            return (
              <Link
                key={p!.id}
                href={`/products/${p!.handle}`}
                className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/30"
              >
                {img && (
                  <Image
                    src={img}
                    alt={p!.title}
                    fill
                    sizes="33vw"
                    className="object-cover object-top"
                    priority={i === 0}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .hero-bento-tile { will-change: transform; }
          @keyframes float-a { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes float-b { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes float-c { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          .anim-1 { animation: float-a 6s ease-in-out infinite; }
          .anim-2 { animation: float-b 6s ease-in-out 0.5s infinite; }
          .anim-3 { animation: float-c 6s ease-in-out 1.0s infinite; }
          .anim-4 { animation: float-b 6s ease-in-out 1.5s infinite; }
          .anim-5 { animation: float-a 6s ease-in-out 2.0s infinite; }
        }
      `}</style>
    </section>
  );
}
