import Image from "next/image";
import Link from "next/link";
import { AFTER_DARK_HERO, AFTER_DARK_PATH } from "@/lib/after-dark";
import { AfterDarkTrustRow } from "./AfterDarkTrustRow";

// Wine band at the top of /after-dark (mockup afterdark-hero-bg-v3, option a):
// text left, one floating toy cut-out right on every width, trust row below.
// The toy links to its page only while that page is listed and in stock
// (`featuredListed`); otherwise it is the same picture without a link.
export function AfterDarkHero({
  newCount,
  featuredListed,
}: {
  newCount: number;
  featuredListed: boolean;
}) {
  const toy = (
    <Image
      src={AFTER_DARK_HERO.src}
      alt=""
      width={AFTER_DARK_HERO.width}
      height={AFTER_DARK_HERO.height}
      sizes="(min-width: 768px) 255px, 165px"
      preload
      className="h-[220px] w-auto drop-shadow-[0_14px_14px_rgb(0_0_0/0.35)] md:h-[340px]"
    />
  );
  const float = "relative block motion-safe:animate-after-dark-float";

  return (
    <section data-after-dark-surface="wine" className="after-dark-hero-bg relative overflow-hidden">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[1.05fr_0.95fr] items-center pl-5 pt-6 md:px-8 md:pt-10">
        <div className="relative z-[1] pb-4 md:pb-10">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.26em] text-champagne-gold md:text-[12px]">
            Private · 18+
          </p>
          <h1 className="mt-2 font-display text-[52px] font-normal leading-[0.95] text-champagne-50 md:mt-3 md:text-[96px]">
            After
            <br />
            <em className="italic text-champagne-gold-soft">Dark</em>
          </h1>
          <p className="mt-3 font-sans text-[14px] leading-[1.5] text-champagne-200 md:mt-5 md:text-[18px]">
            Toys, games and play for two.
          </p>
          {newCount > 0 && (
            <Link
              href={`${AFTER_DARK_PATH}?sort=new`}
              className="mt-4 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-champagne-gold/60 px-3 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-champagne-gold-soft transition-colors hover:border-champagne-gold hover:text-champagne-50 md:mt-6 md:text-[11px]"
            >
              <span aria-hidden="true">✦</span> {newCount} new{" "}
              {newCount === 1 ? "piece" : "pieces"}
            </Link>
          )}
        </div>

        <div className="relative flex h-[250px] items-center justify-center md:h-[400px]">
          <div
            aria-hidden="true"
            className="after-dark-spotlight pointer-events-none absolute left-1/2 top-1/2 h-[125%] w-[150%] -translate-x-1/2 -translate-y-1/2"
          />
          <div
            aria-hidden="true"
            className="after-dark-toy-shadow pointer-events-none absolute bottom-9 left-1/2 h-3 w-[100px] -translate-x-1/2 motion-safe:animate-after-dark-shadow md:bottom-16 md:h-5 md:w-[190px]"
          />
          {featuredListed ? (
            <Link
              href={`/products/${AFTER_DARK_HERO.handle}`}
              aria-label="See the featured piece"
              className={float}
            >
              {toy}
            </Link>
          ) : (
            <div className={float}>{toy}</div>
          )}
        </div>
      </div>

      <AfterDarkTrustRow />
    </section>
  );
}
