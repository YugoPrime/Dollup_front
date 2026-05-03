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
  category?: string;
  collection?: string;
  tag?: string;
  order?: string;
};

export async function listProducts(args: ListProductsArgs = {}) {
  const region = await getRegion();
  const query: HttpTypes.StoreProductListParams = {
    limit: args.limit ?? 24,
    offset: args.offset ?? 0,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
  };
  if (args.q) query.q = args.q;
  if (args.category) query.category_id = [args.category];
  if (args.collection) query.collection_id = [args.collection];
  if (args.tag) query.tag_id = [args.tag];
  if (args.order) query.order = args.order;

  const { products, count } = await sdk.store.product.list(query);
  return { products, count, region };
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
 * Returns up to 5 "featured" products for the hero bento.
 * Strategy: products tagged `featured` first, then fall back to most recent.
 */
export async function listFeatured(): Promise<HttpTypes.StoreProduct[]> {
  // Try the explicit "featured" tag first
  try {
    const tagged = await listProducts({ tag: "featured", limit: 5 });
    if (tagged.products.length >= 3) return tagged.products.slice(0, 5);
  } catch {
    // fall through
  }
  const recent = await listProducts({ order: "-created_at", limit: 5 });
  return recent.products.slice(0, 5);
}

/**
 * Returns up to 4 products from the "essentials" collection or tag.
 * Used by the Babe Essentials bento on the home page.
 */
export async function listEssentials(): Promise<HttpTypes.StoreProduct[]> {
  try {
    const tagged = await listProducts({ tag: "essentials", limit: 4 });
    if (tagged.products.length) return tagged.products.slice(0, 4);
  } catch {}
  try {
    const collected = await listProducts({ collection: "essentials", limit: 4 });
    if (collected.products.length) return collected.products.slice(0, 4);
  } catch {}
  return [];
}
