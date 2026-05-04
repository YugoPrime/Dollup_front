import Link from "next/link";
import type { Metadata } from "next";
import {
  listProducts,
  listCategories,
  getTagIdByValue,
  expandCategoryWithDescendants,
  getLatestCollectionTag,
  getShopFacets,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilterSidebar } from "@/components/shop/ShopFilterSidebar";
import { ShopSortDropdown } from "@/components/shop/ShopSortDropdown";
import { ShopMobileClient } from "@/components/shop/ShopMobileClient";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop dresses, lingerie, beachwear and accessories.",
};

type SearchParams = Promise<{
  category?: string;
  q?: string;
  sort?: string;
  size?: string;
  color?: string;
  tag?: string;
  page?: string;
  on_sale?: string;
  price_min?: string;
  price_max?: string;
}>;

const PER_PAGE = 24;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const categoryHandle = sp.category ?? null;
  const q = sp.q ?? undefined;
  const tagValue = sp.tag ?? null;
  const sortKey = sp.sort ?? "new";
  const onSale = sp.on_sale === "1";
  const sizeFilter = sp.size ?? undefined;
  const colorFilter = sp.color ?? undefined;
  const priceMin = sp.price_min ? Number(sp.price_min) : undefined;
  const priceMax = sp.price_max ? Number(sp.price_max) : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [allCategories, latestCollection] = await Promise.all([
    listCategories(),
    getLatestCollectionTag().catch(() => null),
  ]);
  const latestTag = latestCollection?.value ?? null;
  // Trim trailing slashes so /shop?category=beachwear/ still matches "beachwear".
  const normalizedHandle = categoryHandle?.replace(/\/+$/, "") ?? null;
  const matchedCategory = normalizedHandle
    ? allCategories.find((c) => c.handle === normalizedHandle)
    : null;
  const categoryFilter = matchedCategory
    ? expandCategoryWithDescendants(matchedCategory.id, allCategories)
    : undefined;

  const tagId = tagValue ? await getTagIdByValue(tagValue).catch(() => null) : null;

  // Sort: "price-asc"/"price-desc" go through a server-side re-sort because
  // Store API order on a computed field is unreliable. Other keys map to
  // standard Medusa order strings.
  let order: string | undefined;
  let sortPrice: "asc" | "desc" | undefined;
  if (sortKey === "price-asc") sortPrice = "asc";
  else if (sortKey === "price-desc") sortPrice = "desc";
  else if (sortKey === "new") order = "-created_at";
  // "popular" falls through to default ordering — no popularity metric yet.

  const offset = (page - 1) * PER_PAGE;

  // Fetch facets in parallel with the product list so the sidebar always shows
  // sizes/colors/price-range that exist within the current category/tag scope.
  const [productsRes, facets] = await Promise.all([
    listProducts({
      limit: PER_PAGE,
      offset,
      q,
      category: categoryFilter,
      tag: tagId ?? undefined,
      order,
      onSale,
      size: sizeFilter,
      color: colorFilter,
      priceMin,
      priceMax,
      sortPrice,
    }).catch((err) => {
      console.error("Shop load failed:", err);
      return { products: [] as Awaited<ReturnType<typeof listProducts>>["products"], count: 0, region: null };
    }),
    getShopFacets({
      q,
      category: categoryFilter,
      tag: tagId ?? undefined,
      onSale,
    }).catch(() => ({ sizes: [], colors: [], priceMin: 0, priceMax: 0 })),
  ]);
  const products = productsRes.products;
  const total = productsRes.count;

  const title = q
    ? `Search: ${q}`
    : onSale
      ? matchedCategory?.name
        ? `${matchedCategory.name} on sale`
        : "Sale"
      : matchedCategory?.name ?? (tagValue ? `${tagValue} edit` : "All products");

  return (
    <main>
      <div className="border-b border-blush-100 bg-white px-4 py-4 md:flex md:items-end md:justify-between md:px-8 md:py-6">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            <Link href="/" className="hover:text-coral-500">Home</Link>
            <span className="mx-1.5 text-blush-400">/</span>
            <span>Shop</span>
          </p>
          <h1 className="mt-1 font-display text-[28px] capitalize leading-none text-ink md:text-[44px]">
            {title} <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>collection</em>
          </h1>
          <p className="mt-1.5 font-sans text-[11px] text-ink-muted md:text-[12px]">{total} {total === 1 ? "style" : "styles"}</p>
        </div>
        <div className="mt-3 md:mt-0">
          <ShopSortDropdown />
        </div>
      </div>

      {/* Mobile shell: chips, grid, sticky bar, sheet */}
      <ShopMobileClient
        categories={allCategories.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          parent_category_id: c.parent_category_id,
        }))}
        facets={facets}
      >
        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 px-4 py-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} latestCollectionTag={latestTag} />
              ))}
            </div>
            <Pagination page={page} total={total} sp={sp} />
          </>
        )}
      </ShopMobileClient>

      {/* Desktop body */}
      <div className="mx-auto hidden max-w-[1280px] gap-6 px-8 pb-12 pt-6 md:grid md:grid-cols-[260px_1fr] md:items-start">
        <ShopFilterSidebar
          categories={allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
            parent_category_id: c.parent_category_id,
          }))}
          facets={facets}
        />
        <div>
          {products.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} latestCollectionTag={latestTag} />
                ))}
              </div>
              <Pagination page={page} total={total} sp={sp} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-10 py-20 text-center">
      <p className="mb-2 font-display text-lg text-ink">No products found</p>
      <p className="font-sans text-[13px] text-ink-muted">Try adjusting your filters or check back soon.</p>
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
    if (sp.size) params.set("size", sp.size);
    if (sp.color) params.set("color", sp.color);
    if (sp.tag) params.set("tag", sp.tag);
    if (sp.on_sale) params.set("on_sale", sp.on_sale);
    if (sp.price_min) params.set("price_min", sp.price_min);
    if (sp.price_max) params.set("price_max", sp.price_max);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-2 pb-6">
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
