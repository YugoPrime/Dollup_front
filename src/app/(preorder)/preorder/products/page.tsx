import Link from "next/link";
import { listPreorderProducts } from "@/lib/preorder";
import { PreorderProductCard } from "@/components/preorder/PreorderProductCard";

export const revalidate = 60;

export default async function PreorderCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = 24;
  const offset = (page - 1) * pageSize;
  const { products, count } = await listPreorderProducts({
    limit: pageSize,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="border-b border-sage-100 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">
          Pre-Order Catalog
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">All pre-order pieces</h1>
        <p className="mt-2 text-[13px] text-ink-muted">
          {count} {count === 1 ? "piece" : "pieces"} · 75% deposit · Arrives in ~15–20 days
        </p>
      </header>

      {products.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-sage-200 bg-sage-50 p-10 text-center">
          <p className="font-display text-xl text-ink">Nothing on pre-order yet.</p>
          <p className="mt-2 text-[14px] text-ink-muted">
            Check back soon, or request something specific.
          </p>
          <Link
            href="/preorder/request"
            className="mt-5 inline-block rounded-full bg-sage-700 px-5 py-2.5 text-[13px] font-semibold text-cream hover:bg-sage-900"
          >
            Request a SHEIN item →
          </Link>
        </div>
      ) : (
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <PreorderProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2 text-sm" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/preorder/products?page=${n}`}
              className={
                "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition " +
                (n === page
                  ? "bg-sage-700 text-cream"
                  : "border border-sage-200 text-ink-soft hover:bg-sage-50")
              }
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
