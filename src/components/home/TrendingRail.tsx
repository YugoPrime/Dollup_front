import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

type Product = HttpTypes.StoreProduct;

export function TrendingRail({
  products,
  latestCollectionTag = null,
}: {
  products: Product[];
  latestCollectionTag?: string | null;
}) {
  if (!products.length) return null;
  return (
    <section className="bg-blush-100 py-5 md:py-7">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
            Trending <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>now</em>
          </h2>
          <Link
            href="/shop?sort=trending"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-coral-500 md:text-[12px]"
          >
            See all →
          </Link>
        </div>
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 10).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {/* Desktop: 5-up grid */}
        <div className="hidden gap-4 px-10 md:grid md:grid-cols-5">
          {products.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} latestCollectionTag={latestCollectionTag} />
          ))}
        </div>
      </div>
    </section>
  );
}
