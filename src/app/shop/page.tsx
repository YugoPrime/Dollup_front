import Link from "next/link";
import type { Metadata } from "next";
import { listProducts, listCategories } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters, SortSelect } from "@/components/shop/ShopFilters";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop dresses, lingerie, beachwear and accessories.",
};

type SearchParams = Promise<{
  category?: string;
  q?: string;
  sort?: string;
  page?: string;
}>;

const PER_PAGE = 24;

const SORT_MAP: Record<string, string> = {
  new: "-created_at",
  low: "variants.calculated_price",
  high: "-variants.calculated_price",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const categoryHandle = sp.category ?? null;
  const q = sp.q ?? undefined;
  const sortKey = sp.sort ?? "featured";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const allCategories = await listCategories();
  const matchedCategory = categoryHandle
    ? allCategories.find((c) => c.handle === categoryHandle)
    : null;

  const order = SORT_MAP[sortKey];
  const offset = (page - 1) * PER_PAGE;

  let products: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  let total = 0;
  try {
    const res = await listProducts({
      limit: PER_PAGE,
      offset,
      q,
      category: matchedCategory?.id,
      order,
    });
    products = res.products;
    total = res.count;
  } catch (err) {
    console.error("Shop load failed:", err);
  }

  const title = q
    ? `Search: ${q}`
    : matchedCategory?.name ?? "All Products";

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-20 md:px-10">
      <div className="mb-8 border-b border-blush-400 py-10">
        <div className="mb-2.5 flex items-center gap-2 font-sans text-xs text-ink-muted">
          <Link href="/" className="hover:text-coral-500">
            Home
          </Link>
          <span className="text-blush-400">/</span>
          <span className="font-medium text-ink">{title}</span>
        </div>
        <h1 className="mb-1 font-display text-4xl font-bold text-ink">
          {title}
        </h1>
        <p className="font-sans text-[13px] text-ink-muted">
          {total} {total === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="flex flex-col gap-10 md:flex-row md:items-start">
        <ShopFilters
          categories={allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
          }))}
          activeHandle={categoryHandle}
        />

        <div className="flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <SortSelect />
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center px-10 py-20 text-center">
              <p className="mb-2 font-display text-lg text-ink">
                No products found
              </p>
              <p className="font-sans text-[13px] text-ink-muted">
                Try adjusting your filters or check back soon.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {total > PER_PAGE && (
                <Pagination page={page} total={total} sp={sp} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  total,
  sp,
}: {
  page: number;
  total: number;
  sp: Awaited<SearchParams>;
}) {
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.category) params.set("category", sp.category);
    if (sp.q) params.set("q", sp.q);
    if (sp.sort) params.set("sort", sp.sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="rounded border-[1.5px] border-coral-500 px-5 py-2 font-sans text-[13px] font-semibold text-coral-500 hover:bg-blush-100"
        >
          ← Previous
        </Link>
      )}
      <span className="px-3 font-sans text-[13px] text-ink-soft">
        Page {page} of {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="rounded bg-coral-500 px-5 py-2 font-sans text-[13px] font-semibold text-white hover:bg-coral-700"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
