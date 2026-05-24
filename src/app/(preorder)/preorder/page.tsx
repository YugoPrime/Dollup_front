import Link from "next/link";
import { listPreorderProducts } from "@/lib/preorder";
import { PreorderBadge } from "@/components/preorder/PreorderBadge";
import { PreorderEtaBadge } from "@/components/preorder/PreorderEtaBadge";

export const revalidate = 60;

export default async function PreorderHomePage() {
  const { products } = await listPreorderProducts({ limit: 12 });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-ink">Pre-Order Store</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Curated SHEIN finds, sized and delivered locally. 75% deposit reserves your piece.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

      {products.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">
          No pre-order products yet — check back soon.
        </p>
      )}
    </main>
  );
}
