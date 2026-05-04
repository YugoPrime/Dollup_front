import "server-only";
import { sdk } from "./medusa";
import { getRegion } from "./region";
import type { HttpTypes } from "@medusajs/types";

const PRODUCT_FIELDS =
  "*variants,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,*options,*options.values,*images,*tags,*collection,*categories";

export type ListProductsArgs = {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string | string[];
  collection?: string;
  tag?: string;
  order?: string;
  onSale?: boolean;
};

export async function listProducts(args: ListProductsArgs = {}) {
  const region = await getRegion();
  const limit = args.limit ?? 24;
  const offset = args.offset ?? 0;

  const baseQuery: HttpTypes.StoreProductListParams = {
    limit,
    offset,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
  };
  if (args.q) baseQuery.q = args.q;
  if (args.category) {
    baseQuery.category_id = Array.isArray(args.category) ? args.category : [args.category];
  }
  if (args.collection) baseQuery.collection_id = [args.collection];
  if (args.tag) baseQuery.tag_id = [args.tag];
  if (args.order) baseQuery.order = args.order;

  if (args.onSale) {
    return listOnSaleProducts(args, region);
  }

  if (args.q) {
    return listWithSkuFallback(args, region, baseQuery);
  }

  const { products, count } = await sdk.store.product.list(baseQuery);
  return { products, count, region };
}

// Store API's q only matches title/description, so a customer typing the parent
// SKU (e.g. "IS520") finds nothing. Handles in this catalog are the lowercased
// parent SKU (see inventory-audit/scripts/import-medusa.ts handleFromRef), so we
// run a parallel exact-handle lookup and prepend it to the q result.
async function listWithSkuFallback(
  args: ListProductsArgs,
  region: Awaited<ReturnType<typeof getRegion>>,
  baseQuery: HttpTypes.StoreProductListParams,
) {
  const q = (args.q ?? "").trim();
  // Skip handle lookup for multi-word queries — handles are single tokens.
  const handleQuery = !q.includes(" ") ? q.toLowerCase() : null;

  const handlePromise = handleQuery
    ? sdk.store.product.list({
        handle: handleQuery,
        region_id: region.id,
        fields: PRODUCT_FIELDS,
        limit: 1,
      })
    : Promise.resolve({ products: [] as HttpTypes.StoreProduct[], count: 0 });

  const [main, byHandle] = await Promise.all([
    sdk.store.product.list(baseQuery),
    handlePromise,
  ]);

  const products = [...main.products];
  const handleHit = byHandle.products?.[0];
  let extra = 0;
  if (handleHit && !products.some((p) => p.id === handleHit.id)) {
    products.unshift(handleHit);
    extra = 1;
  }
  return { products, count: main.count + extra, region };
}

// On-sale filter: Medusa Store API can't filter by "has discount" directly, so
// we page through products (catalog ~600 items) and keep ones whose first variant
// has calculated_amount < original_amount — i.e. covered by a Sale price list.
async function listOnSaleProducts(
  args: ListProductsArgs,
  region: Awaited<ReturnType<typeof getRegion>>,
) {
  const baseFilters: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 100,
    offset: 0,
  };
  if (args.category) {
    baseFilters.category_id = Array.isArray(args.category) ? args.category : [args.category];
  }
  if (args.collection) baseFilters.collection_id = [args.collection];
  if (args.tag) baseFilters.tag_id = [args.tag];
  if (args.order) baseFilters.order = args.order;

  const all: HttpTypes.StoreProduct[] = [];
  const MAX_BATCHES = 12; // 12 × 100 = 1200 product cap, enough headroom for a ~600 catalog
  for (let i = 0; i < MAX_BATCHES; i++) {
    const res = await sdk.store.product.list({ ...baseFilters, offset: i * 100 });
    all.push(...res.products);
    if (res.products.length < 100) break;
  }

  const onSale = all.filter((p) =>
    (p.variants ?? []).some((v) => {
      const cp = (v as { calculated_price?: { calculated_amount?: number | null; original_amount?: number | null } | null }).calculated_price;
      const c = cp?.calculated_amount;
      const o = cp?.original_amount;
      return typeof c === "number" && typeof o === "number" && c < o;
    }),
  );

  const limit = args.limit ?? 24;
  const offset = args.offset ?? 0;
  return {
    products: onSale.slice(offset, offset + limit),
    count: onSale.length,
    region,
  };
}

// Returns the category id plus the ids of all its descendants. Used so that
// /shop?category=beachwear (a parent bucket with no direct products) still
// surfaces items from one-pieces, bikini-sets, cover-ups, etc.
export function expandCategoryWithDescendants(
  rootId: string,
  all: { id: string; parent_category_id: string | null }[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    const p = c.parent_category_id;
    if (!p) continue;
    const arr = childrenByParent.get(p) ?? [];
    arr.push(c.id);
    childrenByParent.set(p, arr);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const child of childrenByParent.get(cur) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        stack.push(child);
      }
    }
  }
  return [...ids];
}

export async function getProductByHandle(handle: string) {
  const region = await getRegion();
  const { products } = await sdk.store.product.list({
    handle,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 1,
  });
  return { product: products?.[0] ?? null, region };
}

export async function listCategories() {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,parent_category_id",
    limit: 100,
  });
  return product_categories ?? [];
}

export async function listCollections() {
  const { collections } = await sdk.store.collection.list({
    fields: "id,title,handle",
    limit: 100,
  });
  return collections ?? [];
}

/**
 * Resolves a product-tag value (e.g. "winter") to its Medusa tag id, used by
 * shop filtering. Returns null if no tag matches.
 */
export async function getTagIdByValue(value: string): Promise<string | null> {
  const target = value.trim().toLowerCase();
  if (!target) return null;
  const res = await sdk.client.fetch<{
    product_tags: Array<{ id: string; value: string }>;
  }>("/store/product-tags", {
    method: "GET",
    query: { fields: "id,value", limit: 200 },
  });
  for (const t of res.product_tags ?? []) {
    if ((t.value ?? "").toLowerCase() === target) return t.id;
  }
  return null;
}

// Returns the product-tag id for the highest-numbered `collectionN` tag —
// used to surface the latest drop on the home page. Each new collection import
// (e.g. collection29) automatically becomes the new "latest" with no code change.
// The SDK doesn't expose store.productTag.list yet, so we hit the endpoint directly.
export async function getLatestCollectionTagId(): Promise<string | null> {
  const res = await sdk.client.fetch<{
    product_tags: Array<{ id: string; value: string }>;
  }>("/store/product-tags", {
    method: "GET",
    query: { fields: "id,value", limit: 200 },
  });
  let best: { id: string; n: number } | null = null;
  for (const t of res.product_tags ?? []) {
    const m = /^collection(\d+)$/i.exec(t.value);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!best || n > best.n) best = { id: t.id, n };
  }
  return best?.id ?? null;
}

/**
 * Returns up to 5 products from the latest collection for the hero bento.
 * "Latest collection" = the highest-numbered `collectionN` tag in Medusa.
 * Falls back to the most recent products globally if no collection tag exists.
 */
export async function listFeatured(): Promise<HttpTypes.StoreProduct[]> {
  const latestTagId = await getLatestCollectionTagId().catch(() => null);
  if (latestTagId) {
    try {
      const tagged = await listProducts({
        tag: latestTagId,
        order: "-created_at",
        limit: 5,
      });
      if (tagged.products.length) return tagged.products.slice(0, 5);
    } catch {
      // fall through to recent
    }
  }
  const recent = await listProducts({ order: "-created_at", limit: 5 });
  return recent.products.slice(0, 5);
}

// Babe Essentials products — hand-curated by handle.
// Edit this list to swap which products appear in the home page mosaic.
const ESSENTIALS_HANDLES = ["is1361", "is1362", "is520"];

/**
 * Returns the curated "Babe essentials" products for the home page mosaic.
 * Looks them up by handle, preserving the order in ESSENTIALS_HANDLES.
 */
export async function listEssentials(): Promise<HttpTypes.StoreProduct[]> {
  const results = await Promise.all(
    ESSENTIALS_HANDLES.map((h) =>
      getProductByHandle(h)
        .then((r) => r.product)
        .catch(() => null),
    ),
  );
  return results.filter((p): p is HttpTypes.StoreProduct => p != null);
}
