import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

export function YouMayAlsoLike({
  products,
  latestCollectionTag = null,
}: {
  products: HttpTypes.StoreProduct[];
  latestCollectionTag?: string | null;
}) {
  if (!products.length) return null;
  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between px-4 pb-4 md:px-8">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[28px]">
            You may also <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>like</em>
          </h2>
          <Link href="/shop" className="font-sans text-[10px] font-bold uppercase tracking-wider text-coral-500 md:text-[12px]">
            See all →
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 6).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} latestCollectionTag={latestCollectionTag} />
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-5 gap-4 px-8 md:grid">
          {products.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} latestCollectionTag={latestCollectionTag} />
          ))}
        </div>
      </div>
    </section>
  );
}
