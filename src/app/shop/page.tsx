import Link from "next/link";
import type { Metadata } from "next";
import {
  listProducts,
  listCategories,
  getTagIdByValue,
  expandCategoryWithDescendants,
  getLatestCollectionTag,
  getShopFacets,
  getCategoryHandlesWithStock,
} from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilterSidebar } from "@/components/shop/ShopFilterSidebar";
import { ShopSortDropdown } from "@/components/shop/ShopSortDropdown";
import { ShopMobileClient } from "@/components/shop/ShopMobileClient";
import { OptimisticGrid, OptimisticCardSlot } from "@/components/shop/OptimisticGrid";

export const revalidate = 300;

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
const SITE_URL = "https://dollupboutique.com";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const title = sp.q
    ? `Search results for ${sp.q}`
    : sp.category
      ? `${titleCase(sp.category)}`
      : sp.on_sale === "1"
        ? "Sale"
        : "Shop";
  const canonical = buildShopCanonical(sp);

  return {
    title,
    description: "Shop dresses, lingerie, beachwear and accessories at Doll Up Boutique Mauritius.",
    alternates: { canonical },
    openGraph: {
      title,
      description: "Shop dresses, lingerie, beachwear and accessories at Doll Up Boutique Mauritius.",
      url: canonical,
    },
  };
}

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
  // Multi-select: ?size=S,M and ?color=red,blue. Split here so the page,
  // facet builder, and listProducts all see a clean string[] (single values
  // still work as a one-item array).
  const sizeFilter = parseMultiParam(sp.size);
  const colorFilter = parseMultiParam(sp.color);
  // For `selectedColor` (ProductCard hint), only use a single color: when the
  // shopper has selected 2+ colors, no per-color hero override is meaningful.
  const singleSelectedColor =
    colorFilter && colorFilter.length === 1 ? colorFilter[0] : null;
  const priceMin = sp.price_min ? Number(sp.price_min) : undefined;
  const priceMax = sp.price_max ? Number(sp.price_max) : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [allCategories, latestCollection, stockedHandlesSet] = await Promise.all([
    listCategories(),
    getLatestCollectionTag().catch(() => null),
    getCategoryHandlesWithStock().catch(() => new Set<string>()),
  ]);
  // Serialize to array so it crosses the client boundary cleanly. Empty set ⇒
  // upstream Medusa hiccup; the components fall back to "show everything" when
  // they receive an empty list, so the sidebar/sheet never blank-out the tree.
  const stockedHandles = Array.from(stockedHandlesSet);
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
  // listProducts owns preorder/unlisted/out-of-stock filtering before
  // pagination, so the count and grid stay aligned.
  const products = productsRes.products;
  const total = productsRes.count;

  const title = q
    ? `Search: ${q}`
    : onSale
      ? matchedCategory?.name
        ? `${matchedCategory.name} on sale`
        : "Sale"
      : matchedCategory?.name ?? (tagValue ? `${tagValue} edit` : "All products");

  // Cross-sell strip: when a customer is browsing Lingerie, surface a soft
  // "spice up your love life" link into the Intimates catalog. The handle
  // check is case-sensitive against Medusa's slug ("lingerie").
  const showIntimatesTeaser = matchedCategory?.handle === "lingerie";

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shopBreadcrumbJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            shopItemListJsonLd(products, page, PER_PAGE, title),
          ),
        }}
      />
      {showIntimatesTeaser ? (
        <Link
          href="/shop?category=intimates"
          className="group block border-b border-blush-100 bg-gradient-to-r from-coral-500 via-coral-700 to-ink px-4 py-3 text-white transition hover:from-ink hover:via-coral-700 hover:to-coral-500 md:px-8 md:py-4"
        >
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                Feeling bold?
              </p>
              <p className="mt-0.5 font-display text-[18px] leading-tight md:text-[22px]">
                Spice up your love life{" "}
                <em
                  className="not-italic text-blush-100"
                  style={{ fontStyle: "italic" }}
                >
                  — explore Intimates
                </em>
              </p>
            </div>
            <span
              aria-hidden
              className="font-sans text-[20px] transition-transform group-hover:translate-x-1 md:text-[24px]"
            >
              →
            </span>
          </div>
        </Link>
      ) : null}

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

      <ShopMobileClient
        categories={allCategories.map((c) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
          parent_category_id: c.parent_category_id,
        }))}
        stockedHandles={stockedHandles}
        facets={facets}
      />

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 pb-[72px] pt-3 md:grid-cols-[260px_1fr] md:items-start md:px-8 md:pb-12 md:pt-6">
        <ShopFilterSidebar
          categories={allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
            parent_category_id: c.parent_category_id,
          }))}
          stockedHandles={stockedHandles}
          facets={facets}
        />
        <div>
          {products.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <OptimisticGrid>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
                  {products.map((p, index) => (
                    <OptimisticCardSlot key={p.id} productId={p.id}>
                      <ProductCard
                        product={p}
                        latestCollectionTag={latestTag}
                        selectedColor={singleSelectedColor}
                        imagePriority={index < 2}
                      />
                    </OptimisticCardSlot>
                  ))}
                </div>
              </OptimisticGrid>
              <Pagination page={page} total={total} sp={sp} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function parseMultiParam(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const out = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

function buildShopCanonical(sp: Awaited<SearchParams>) {
  // Canonical is self-referential for paginated views (page > 1) so deep
  // pages get indexed independently. We omit volatile filters (size, color,
  // price ranges) — those are facets, not distinct pages — but keep the
  // category, tag, sale, and search-query filters since each is its own
  // landing-page intent.
  const params = new URLSearchParams();
  if (sp.category) params.set("category", sp.category);
  if (sp.q) params.set("q", sp.q);
  if (sp.tag) params.set("tag", sp.tag);
  if (sp.on_sale) params.set("on_sale", sp.on_sale);
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  if (pageNum > 1) params.set("page", String(pageNum));
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shopItemListJsonLd(
  products: Awaited<ReturnType<typeof listProducts>>["products"],
  page: number,
  perPage: number,
  listName: string,
) {
  const startPosition = (page - 1) * perPage + 1;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${listName} — Doll Up Boutique`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: startPosition + i,
      url: `${SITE_URL}/products/${p.handle}`,
      name: p.title,
    })),
  };
}

function shopBreadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_URL}/shop`,
      },
    ],
  };
}

function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
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
