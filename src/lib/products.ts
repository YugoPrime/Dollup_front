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
  // Server-side facet filters (Medusa Store API has no native equivalents)
  size?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  // Sort price asc/desc client-side after fetch — Medusa Store API doesn't
  // sort by computed `calculated_price` reliably, so when this is set we
  // page through results and re-sort.
  sortPrice?: "asc" | "desc";
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

  // Any of these facet filters require fetching a wider pool and filtering
  // in memory — Store API doesn't expose the equivalents.
  const needsClientFilter =
    args.onSale ||
    args.size ||
    args.color ||
    args.priceMin != null ||
    args.priceMax != null ||
    args.sortPrice;

  if (needsClientFilter) {
    return listWithFacetFilters(args, region);
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

// Unified facet filter: Medusa Store API has no native filters for on-sale,
// option values (size/color), or price range. So we page through the catalog
// (cap 1200) applying the cheap server-side filters first (category/tag/q) and
// then apply each enabled facet in memory. Slice to the requested page at the end.
async function listWithFacetFilters(
  args: ListProductsArgs,
  region: Awaited<ReturnType<typeof getRegion>>,
) {
  const baseFilters: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 100,
    offset: 0,
  };
  if (args.q) baseFilters.q = args.q;
  if (args.category) {
    baseFilters.category_id = Array.isArray(args.category) ? args.category : [args.category];
  }
  if (args.collection) baseFilters.collection_id = [args.collection];
  if (args.tag) baseFilters.tag_id = [args.tag];
  // Skip Store-side `order` if we're going to re-sort by price below — saves a wasted sort.
  if (args.order && !args.sortPrice) baseFilters.order = args.order;

  const all: HttpTypes.StoreProduct[] = [];
  const MAX_BATCHES = 12;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const res = await sdk.store.product.list({ ...baseFilters, offset: i * 100 });
    all.push(...res.products);
    if (res.products.length < 100) break;
  }

  let filtered = all;

  if (args.onSale) {
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) => {
        const cp = readCalculatedPrice(v);
        const c = cp?.calculated_amount;
        const o = cp?.original_amount;
        return typeof c === "number" && typeof o === "number" && c < o;
      }),
    );
  }

  if (args.size) {
    const target = canonicalSize(args.size) ?? args.size;
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) =>
        (v.options ?? []).some(
          (o) =>
            isSizeOption(o) &&
            (canonicalSize(o.value ?? "") ?? "") === target,
        ),
      ),
    );
  }

  if (args.color) {
    const target = canonicalColor(args.color);
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) =>
        (v.options ?? []).some(
          (o) =>
            isColorOption(o) &&
            canonicalColor(o.value ?? "") === target,
        ),
      ),
    );
  }

  if (args.priceMin != null || args.priceMax != null) {
    const lo = args.priceMin ?? -Infinity;
    const hi = args.priceMax ?? Infinity;
    filtered = filtered.filter((p) => {
      const amounts = (p.variants ?? [])
        .map((v) => readCalculatedPrice(v)?.calculated_amount)
        .filter((a): a is number => typeof a === "number");
      if (!amounts.length) return false;
      const min = Math.min(...amounts);
      return min >= lo && min <= hi;
    });
  }

  if (args.sortPrice) {
    const dir = args.sortPrice === "asc" ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      const ap = lowestPrice(a) ?? (dir > 0 ? Infinity : -Infinity);
      const bp = lowestPrice(b) ?? (dir > 0 ? Infinity : -Infinity);
      return (ap - bp) * dir;
    });
  }

  const limit = args.limit ?? 24;
  const offset = args.offset ?? 0;
  return {
    products: filtered.slice(offset, offset + limit),
    count: filtered.length,
    region,
  };
}

// --- helpers shared by listWithFacetFilters and getShopFacets ---

type PriceRecord = {
  calculated_amount?: number | null;
  original_amount?: number | null;
} | null;

function readCalculatedPrice(v: HttpTypes.StoreProductVariant): PriceRecord {
  return (v as { calculated_price?: PriceRecord }).calculated_price ?? null;
}

function lowestPrice(p: HttpTypes.StoreProduct): number | null {
  const amounts = (p.variants ?? [])
    .map((v) => readCalculatedPrice(v)?.calculated_amount)
    .filter((a): a is number => typeof a === "number");
  return amounts.length ? Math.min(...amounts) : null;
}

function isSizeOption(o: { option?: { title?: string | null } | null; option_id?: string | null }): boolean {
  const title = o.option?.title ?? "";
  return title.toLowerCase() === "size";
}

function isColorOption(o: { option?: { title?: string | null } | null; option_id?: string | null }): boolean {
  const title = o.option?.title ?? "";
  return title.toLowerCase() === "color";
}

function isVariantInStock(v: HttpTypes.StoreProductVariant): boolean {
  if (!v.manage_inventory) return true;
  return (v.inventory_quantity ?? 0) > 0;
}

// Returns the facets (sizes, colors, price min/max) available within the
// user's current category / tag / on-sale scope so the sidebar can render
// only what's actually buyable. Same fetch pattern as listWithFacetFilters
// but doesn't apply the size/color/price filters — those are what we're
// deriving the facets for.
// Picks one representative product thumbnail per category for the home page
// category-icons row. Uses the newest product in the category. Returns null
// per category if nothing is available so the component falls back to its
// gradient placeholder.
export async function getCategoryIconImages(
  handles: string[],
): Promise<Record<string, string | null>> {
  const region = await getRegion();
  const cats = await listCategories();
  const out: Record<string, string | null> = {};
  await Promise.all(
    handles.map(async (h) => {
      try {
        const cat = cats.find((c) => c.handle === h);
        if (!cat) {
          out[h] = null;
          return;
        }
        const ids = expandCategoryWithDescendants(cat.id, cats);
        const res = await sdk.store.product.list({
          category_id: ids,
          region_id: region.id,
          fields: "id,thumbnail,handle",
          limit: 1,
          order: "-created_at",
        });
        out[h] = res.products[0]?.thumbnail ?? null;
      } catch {
        out[h] = null;
      }
    }),
  );
  return out;
}

export type ShopFacets = {
  sizes: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
};

export async function getShopFacets(args: {
  q?: string;
  category?: string | string[];
  tag?: string;
  onSale?: boolean;
}): Promise<ShopFacets> {
  const region = await getRegion();
  const baseFilters: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 100,
    offset: 0,
  };
  if (args.q) baseFilters.q = args.q;
  if (args.category) {
    baseFilters.category_id = Array.isArray(args.category) ? args.category : [args.category];
  }
  if (args.tag) baseFilters.tag_id = [args.tag];

  const all: HttpTypes.StoreProduct[] = [];
  const MAX_BATCHES = 12;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const res = await sdk.store.product.list({ ...baseFilters, offset: i * 100 });
    all.push(...res.products);
    if (res.products.length < 100) break;
  }

  let scoped = all;
  if (args.onSale) {
    scoped = scoped.filter((p) =>
      (p.variants ?? []).some((v) => {
        const cp = readCalculatedPrice(v);
        const c = cp?.calculated_amount;
        const o = cp?.original_amount;
        return typeof c === "number" && typeof o === "number" && c < o;
      }),
    );
  }

  const sizes = new Set<string>();
  const colors = new Set<string>();
  let lo = Infinity;
  let hi = -Infinity;

  for (const p of scoped) {
    for (const v of p.variants ?? []) {
      if (!isVariantInStock(v)) continue;
      for (const o of v.options ?? []) {
        if (isSizeOption(o) && o.value) sizes.add(o.value);
        if (isColorOption(o) && o.value) {
          const canon = canonicalColor(o.value);
          if (canon) colors.add(canon);
        }
      }
      const amt = readCalculatedPrice(v)?.calculated_amount;
      if (typeof amt === "number") {
        if (amt < lo) lo = amt;
        if (amt > hi) hi = amt;
      }
    }
  }

  const sortedSizes = sortSizes([...sizes]);
  const sortedColors = [...colors].sort();
  return {
    sizes: sortedSizes,
    colors: sortedColors,
    priceMin: lo === Infinity ? 0 : Math.floor(lo),
    priceMax: hi === -Infinity ? 0 : Math.ceil(hi),
  };
}

// Canonical color name → display label. Variants in the catalog use messy
// spellings ("burgandy"/"burgundy", "Light Pink"/"lightpink"/"l.pink"); this
// table maps whatever the variant says into a single canonical bucket so the
// filter doesn't show 4 versions of pink. Returns null for colors we don't
// recognise (intentionally hidden from the filter to keep it tight).
const COLOR_CANONICAL: Record<string, string> = {
  black: "black", white: "white", cream: "cream", ivory: "cream", off: "cream", "off white": "cream",
  red: "red", burgundy: "burgundy", burgandy: "burgundy", wine: "burgundy",
  pink: "pink", "light pink": "pink", "hot pink": "pink", fuchsia: "pink", rose: "pink",
  blush: "blush", nude: "nude", beige: "nude", sand: "nude", tan: "nude", camel: "nude",
  brown: "brown", chocolate: "brown", coffee: "brown",
  grey: "grey", gray: "grey", silver: "grey", charcoal: "grey",
  blue: "blue", navy: "navy", denim: "blue", "light blue": "blue", "sky blue": "blue", teal: "blue",
  green: "green", olive: "green", khaki: "green", mint: "green", emerald: "green",
  yellow: "yellow", mustard: "yellow", gold: "yellow",
  orange: "orange", coral: "coral", peach: "coral", salmon: "coral",
  purple: "purple", lavender: "purple", lilac: "purple", violet: "purple", mauve: "purple",
  multi: "multi", multicolor: "multi", multicolour: "multi", print: "multi", pattern: "multi",
};
function canonicalColor(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return COLOR_CANONICAL[key] ?? COLOR_CANONICAL[key.replace(/[-_\s]+/g, " ")] ?? null;
}

// Canonical size whitelist for the shop filter — bra cup sizes (A/B/C/D),
// shoe sizes (37/38/...), and other one-off variant sizes are intentionally
// excluded so the filter stays clean and predictable.
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Free Size"];
const SIZE_ALIASES: Record<string, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL",
  "2xl": "2XL", xxl: "2XL", "3xl": "3XL", xxxl: "3XL", "4xl": "4XL",
  "free size": "Free Size", freesize: "Free Size", "free-size": "Free Size",
  "one size": "Free Size",
};
function canonicalSize(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return SIZE_ALIASES[key] ?? null;
}
function sortSizes(arr: string[]): string[] {
  // Only keep canonical sizes, dedupe, sort by SIZE_ORDER.
  const canonical = new Set<string>();
  for (const s of arr) {
    const c = canonicalSize(s);
    if (c) canonical.add(c);
  }
  return [...canonical].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
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
  const tag = await getLatestCollectionTag();
  return tag?.id ?? null;
}

export async function getLatestCollectionTag(): Promise<{ id: string; value: string } | null> {
  const res = await sdk.client.fetch<{
    product_tags: Array<{ id: string; value: string }>;
  }>("/store/product-tags", {
    method: "GET",
    query: { fields: "id,value", limit: 200 },
  });
  let best: { id: string; value: string; n: number } | null = null;
  for (const t of res.product_tags ?? []) {
    const m = /^collection(\d+)$/i.exec(t.value);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!best || n > best.n) best = { id: t.id, value: t.value, n };
  }
  return best ? { id: best.id, value: best.value } : null;
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
const ESSENTIALS_HANDLES = ["is1361", "is1362", "is520", "is522"];

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
