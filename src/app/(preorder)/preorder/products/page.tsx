import Link from "next/link";
import { listPreorderProducts } from "@/lib/preorder";
import { PreorderBadge } from "@/components/preorder/PreorderBadge";
import { PreorderEtaBadge } from "@/components/preorder/PreorderEtaBadge";

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
      <h1 className="font-display text-2xl">All pre-order products</h1>
      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const price =
            p.variants[0]?.calculated_price?.calculated_amount ?? null;
          return (
            <Link
              key={p.id}
              href={`/preorder/products/${p.handle}`}
              className="group block"
            >
              <div className="aspect-[3/4] overflow-hidden rounded bg-blush-50">
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-medium text-ink">
                  {p.title}
                </h3>
                <PreorderBadge />
              </div>
              {price !== null && (
                <p className="text-sm font-semibold text-ink">
                  Rs {(price / 100).toFixed(0)}
                </p>
              )}
              <PreorderEtaBadge />
            </Link>
          );
        })}
      </section>

      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/preorder/products?page=${n}`}
              className={
                "rounded px-3 py-1 " +
                (n === page ? "bg-ink text-cream" : "border border-blush-400")
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
