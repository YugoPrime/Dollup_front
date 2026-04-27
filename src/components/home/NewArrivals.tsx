import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

export function NewArrivals({ products }: { products: HttpTypes.StoreProduct[] }) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-coral-500">
            Just Dropped
          </p>
          <h2 className="font-display text-4xl font-bold text-ink">
            New Arrivals
          </h2>
        </div>
        <Link
          href="/shop"
          className="font-sans text-[13px] font-semibold tracking-wide text-coral-500 hover:text-coral-700"
        >
          View All →
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-blush-400 bg-white p-10 text-center">
          <p className="font-display text-lg text-ink">
            No products yet.
          </p>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            Add products in your Medusa admin and they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
