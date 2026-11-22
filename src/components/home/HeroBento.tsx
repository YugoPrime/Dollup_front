import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { HttpTypes } from "@medusajs/types";
import { HeroShell } from "@/components/home/HeroShell";
import {
  HERO_TILE_1_BLUR,
  HERO_TILE_2_BLUR,
  HERO_TILE_3_BLUR,
  HERO_TILE_4_BLUR,
  HERO_TILE_5_BLUR,
} from "@/lib/blur-data";
import { productSalePercent } from "@/lib/sale-listing";

type Product = HttpTypes.StoreProduct;

const HERO_TILE_BLURS = [
  HERO_TILE_1_BLUR,
  HERO_TILE_2_BLUR,
  HERO_TILE_3_BLUR,
  HERO_TILE_4_BLUR,
  HERO_TILE_5_BLUR,
];

function tileBlur(key: string) {
  if (key === "feature") return HERO_TILE_1_BLUR;
  const index = Number(key.slice(1));
  return HERO_TILE_BLURS[index + 1] ?? HERO_TILE_1_BLUR;
}

/**
 * The homepage hero. HeroShell swaps this blush copy for the black-on-white
 * sale copy while a "mono" sale runs (sale-spotlight.ts); the frame, the
 * decorations and the switch live there.
 */
export function HeroBento({
  children,
  initialNow,
}: {
  children: ReactNode;
  /** Server render time, the clock's first snapshot (see useAdventNow). */
  initialNow: number;
}) {
  return (
    <HeroShell
      initialNow={initialNow}
      defaultCopy={
        <div>
          <p className="mb-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            Find your next favorite fit.
          </p>
          <h1 className="font-display text-[56px] leading-[0.92] tracking-[-1.5px] text-ink md:text-[72px]">
            Doll up,
            <br />
            <em className="text-coral-450">babe.</em>
          </h1>
          <p className="mt-4 max-w-[380px] font-sans text-[14px] leading-[1.5] text-ink-soft">
            From everyday essentials to statement looks.
            <br />
            Shop trendy dresses, lingerie &amp; beachwear with island-wide delivery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop?sort=new"
              className="hero-cta group relative overflow-hidden rounded-full bg-coral-500 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_12px_rgba(229,96,74,0.3)] transition-colors hover:bg-coral-700"
            >
              <span className="relative z-10 inline-flex items-center gap-1.5">
                Shop new arrivals
                <span aria-hidden className="hero-cta-arrow inline-block">
                  -&gt;
                </span>
              </span>
            </Link>
            <Link
              href="/shop?on_sale=1"
              className="rounded-full border-2 border-coral-500 bg-white px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
            >
              Browse sale
            </Link>
          </div>
        </div>
      }
    >
      {children}
    </HeroShell>
  );
}

/** "-50%" on a sale pick, same wording as the product cards. Null when not reduced. */
function SaleChip({ product }: { product: Product }) {
  const pct = productSalePercent(product);
  if (pct == null) return null;
  return (
    <span className="absolute left-1.5 top-1.5 z-[1] rounded-full bg-ink px-2 py-0.5 font-sans text-[10px] font-bold leading-[1.4] text-white md:left-2.5 md:top-2.5 md:text-[11px]">
      -{pct}%
    </span>
  );
}

export function HeroBentoProducts({
  products,
  saleChips = false,
}: {
  products: Product[];
  /** Badge each tile with its % off (the sale picks while a mono sale runs). */
  saleChips?: boolean;
}) {
  if (products.length < 3) return <div className="hidden md:block" aria-hidden />;

  const [feature, ...rest] = products;
  const stacked = rest.slice(0, 4);
  const mobileProducts = [feature, stacked[0], stacked[1]].filter(
    (p): p is Product => Boolean(p),
  );

  const tile = (p: Product, key: string, ratio: string, animClass: string) => {
    const img = p.thumbnail ?? p.images?.[0]?.url;
    const imageSizes =
      key === "feature"
        ? "(min-width: 1200px) 260px, (min-width: 768px) 24vw, 1px"
        : "(min-width: 1200px) 190px, (min-width: 768px) 17vw, 1px";
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
            sizes={imageSizes}
            className="object-cover object-top"
            priority={key === "feature"}
            placeholder="blur"
            blurDataURL={tileBlur(key)}
          />
        )}
        {saleChips && <SaleChip product={p} />}
      </Link>
    );
  };

  return (
    <>
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

      <div className="grid grid-cols-3 gap-1.5 md:hidden">
        {mobileProducts.map((p, i) => {
          const img = p.thumbnail ?? p.images?.[0]?.url;
          return (
            <Link
              key={p.id}
              href={`/products/${p.handle}`}
              className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/30"
            >
              {img && (
                <Image
                  src={img}
                  alt={p.title}
                  fill
                  sizes="(max-width: 767px) 33vw, 1px"
                  className="object-cover object-top"
                  placeholder="blur"
                  blurDataURL={HERO_TILE_BLURS[i] ?? HERO_TILE_1_BLUR}
                  priority={i === 0}
                  fetchPriority={i === 0 ? "high" : undefined}
                />
              )}
              {saleChips && <SaleChip product={p} />}
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function HeroBentoProductSkeleton() {
  const cellClass = "animate-pulse rounded-xl bg-white/35";

  return (
    <>
      <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1fr] md:gap-3" aria-hidden>
        <div className={`${cellClass} aspect-[2/3.2]`} />
        <div className="flex flex-col gap-3">
          <div className={`${cellClass} aspect-[3/4]`} />
          <div className={`${cellClass} aspect-[3/4]`} />
        </div>
        <div className="flex flex-col gap-3">
          <div className={`${cellClass} aspect-[3/4]`} />
          <div className={`${cellClass} aspect-[3/4]`} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 md:hidden" aria-hidden>
        <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/30" />
        <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/30" />
        <div className="aspect-[3/4] animate-pulse rounded-lg bg-white/30" />
      </div>
    </>
  );
}
