"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

type Product = HttpTypes.StoreProduct;

const ViewAllTile = ({ count, href }: { count: number; href: string }) => (
  <Link
    href={href}
    className="group flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 p-5 text-center text-white shadow-[0_2px_8px_rgba(229,96,74,0.18)] transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.28)]"
  >
    <div className="mb-2 font-display text-[44px] leading-none transition-transform group-hover:translate-x-1">→</div>
    <div className="font-sans text-[11px] font-bold uppercase tracking-[0.14em]">View all</div>
    <div className="mt-1 font-sans text-[10px] opacity-85">{count} new pieces</div>
  </Link>
);

export function NewArrivalsRail({
  products,
  totalCount,
  latestCollectionTag = null,
}: {
  products: Product[];
  totalCount: number;
  latestCollectionTag?: string | null;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Track scroll position so the prev/next buttons disable at the ends.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length]);

  if (!products.length) return null;

  // Scroll one card-width per click (~25% of viewport on desktop).
  const scrollBy = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = (card?.offsetWidth ?? 240) + 16; // card + gap
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const viewAllHref = latestCollectionTag
    ? `/shop?tag=${encodeURIComponent(latestCollectionTag)}`
    : "/shop?sort=new";

  return (
    <section className="bg-blush-100 py-5 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
            New <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>arrivals</em>
          </h2>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label="Previous"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-blush-300 bg-white text-ink transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-coral-500 hover:text-coral-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label="Next"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-blush-300 bg-white text-ink transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-coral-500 hover:text-coral-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:gap-4 md:px-10 md:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollPaddingInline: "16px" }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              data-card
              className="w-[150px] shrink-0 snap-start md:w-[230px]"
            >
              <ProductCard product={p} latestCollectionTag={latestCollectionTag} />
            </div>
          ))}
          <div data-card className="w-[150px] shrink-0 snap-start md:w-[230px]">
            <div className="aspect-[3/4.5]">
              <ViewAllTile count={totalCount} href={viewAllHref} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
