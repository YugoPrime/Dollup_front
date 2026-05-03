import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

type Product = HttpTypes.StoreProduct;

const ViewAllTile = ({ count }: { count: number }) => (
  <Link
    href="/shop?sort=new"
    className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 p-5 text-center text-white"
  >
    <div className="mb-2 font-display text-[48px] leading-none">→</div>
    <div className="font-sans text-[11px] font-bold uppercase tracking-[0.14em]">View all</div>
    <div className="mt-1 font-sans text-[10px] opacity-80">{count} new pieces</div>
  </Link>
);

export function NewArrivalsRail({ products, totalCount }: { products: Product[]; totalCount: number }) {
  if (!products.length) return null;
  return (
    <section className="bg-blush-100 py-5 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
            New <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>arrivals</em>
          </h2>
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted md:text-[12px]">
            ★ Drop · this week
          </span>
        </div>
        {/* Mobile */}
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 4).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
          <div className="w-[150px]">
            <div className="aspect-[3/4.7]">
              <ViewAllTile count={totalCount} />
            </div>
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden grid-cols-5 gap-4 px-10 md:grid">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          <div className="aspect-[3/4.7]">
            <ViewAllTile count={totalCount} />
          </div>
        </div>
      </div>
    </section>
  );
}
