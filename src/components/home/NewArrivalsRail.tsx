import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";
import { NewArrivalsRailScroller } from "@/components/home/NewArrivalsRailScroller";

type Product = HttpTypes.StoreProduct;

const ViewAllTile = ({ count, href }: { count: number; href: string }) => (
  <Link
    href={href}
    className="group flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 p-5 text-center text-white shadow-[0_2px_8px_rgba(229,96,74,0.18)] transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.28)]"
  >
    <div className="mb-2 font-display text-[44px] leading-none transition-transform group-hover:translate-x-1">-&gt;</div>
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
  if (!products.length) return null;

  const viewAllHref = latestCollectionTag
    ? `/shop?tag=${encodeURIComponent(latestCollectionTag)}`
    : "/shop?sort=new";

  return (
    <section className="bg-blush-100 py-5 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <NewArrivalsRailScroller>
          {products.map((p) => (
            <div
              key={p.id}
              data-card
              className="w-[150px] shrink-0 snap-start md:w-[230px]"
            >
              <ProductCard
                product={p}
                latestCollectionTag={latestCollectionTag}
                imageSizes="(max-width: 768px) 150px, 230px"
              />
            </div>
          ))}
          <div data-card className="w-[150px] shrink-0 snap-start md:w-[230px]">
            <div className="aspect-[3/4.5]">
              <ViewAllTile count={totalCount} href={viewAllHref} />
            </div>
          </div>
        </NewArrivalsRailScroller>
      </div>
    </section>
  );
}
