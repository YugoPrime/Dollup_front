import "server-only";
import { unstable_cache } from "next/cache";
import { listStoreProducts, sdk } from "./medusa";
import { getRegion } from "./region";
import type { HttpTypes } from "@medusajs/types";
import type { CanonicalSize, MysteryBoxSlot } from "@/lib/mystery-box";
import { isInIntimatesCategory, isUnlisted } from "@/lib/visibility";

export const SHOP_FACETS_CACHE_TAG = "shop-facets";
export const PRODUCTS_CACHE_TAG = "products";
export const PRODUCT_TAGS_CACHE_TAG = "product-tags";
export const PRODUCT_CATEGORIES_CACHE_TAG = "product-categories";

const PRODUCT_LIST_FIELDS =
  "id,title,handle,thumbnail,metadata,created_at,updated_at," +
  "variants.id,variants.title,variants.sku,variants.metadata,variants.manage_inventory,+variants.inventory_quantity," +
  "variants.calculated_price.calculated_amount,variants.calculated_price.original_amount,variants.calculated_price.currency_code," +
  "variants.options.value,variants.options.option.title," +
  "options.title,options.values.value,images.url,tags.id,tags.value," +
  "categories.id,categories.name,categories.handle,categories.parent_category_id,collection.id";

// Keep catalog pages small enough that cold-cache bursts don't make Medusa
// hydrate one huge product graph per request. The loop below still assembles a
// full snapshot for filtering/search.
const CATALOG_BATCH_SIZE = 100;
const CATALOG_MAX_BATCHES = 12;
const CATALOG_REVALIDATE_SECONDS = 300;
const inFlightCatalogFetches = new Map<string, Promise<HttpTypes.StoreProduct[]>>();

// Single shared catalog snapshot. Previously listProducts, getShopFacets and
// getCategoryHandlesWithStock each paged through the full catalog (3 × up to
// 5 sequential round-trips on cache miss). Now one snapshot is fetched per
// region with parallel batches, cached 5 min, and reused by all three
// callers — which derive their result with cheap in-memory filtering.
async function fetchAllStoreProducts(
  regionId: string,
): Promise<HttpTypes.StoreProduct[]> {
  const existing = inFlightCatalogFetches.get(regionId);
  if (existing) return existing;

  const promise = fetchAllStoreProductsUncoalesced(regionId);
  inFlightCatalogFetches.set(regionId, promise);
  try {
    return await promise;
  } finally {
    if (inFlightCatalogFetches.get(regionId) === promise) {
      inFlightCatalogFetches.delete(regionId);
    }
  }
}

async function fetchAllStoreProductsUncoalesced(
  regionId: string,
): Promise<HttpTypes.StoreProduct[]> {
  const first = await listStoreProducts({
    region_id: regionId,
    fields: PRODUCT_LIST_FIELDS,
    limit: CATALOG_BATCH_SIZE,
    offset: 0,
  });
  const total = typeof first.count === "number" ? first.count : first.products.length;
  if (first.products.length >= total || first.products.length < CATALOG_BATCH_SIZE) {
    return first.products;
  }
  const totalBatches = Math.min(
    Math.ceil(total / CATALOG_BATCH_SIZE),
    CATALOG_MAX_BATCHES,
  );
  const rest = await Promise.all(
    Array.from({ length: totalBatches - 1 }, (_, i) =>
      listStoreProducts({
        region_id: regionId,
        fields: PRODUCT_LIST_FIELDS,
        limit: CATALOG_BATCH_SIZE,
        offset: (i + 1) * CATALOG_BATCH_SIZE,
      })
        .then((r) => r.products),
    ),
  );
  return [...first.products, ...rest.flat()];
}

const cachedAllStoreProducts = unstable_cache(
  fetchAllStoreProducts,
  ["all-store-products-v2"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

function getProductCollectionId(p: HttpTypes.StoreProduct): string | null {
  const direct = (p as { collection_id?: string | null }).collection_id;
  if (typeof direct === "string" && direct) return direct;
  const nested = (p as { collection?: { id?: string | null } | null }).collection;
  return nested?.id ?? null;
}

function getProductCreatedAt(p: HttpTypes.StoreProduct): number {
  const raw = (p as { created_at?: string | null }).created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Medusa v2 strips any field not explicitly listed here — including base scalars
// like title/handle/thumbnail. Omitting them breaks PDP h1, og:title, canonical,
// JSON-LD, and the homepage Babe-essentials tiles (links resolve to /products/undefined).
const PRODUCT_DETAIL_FIELDS =
  "id,title,handle,thumbnail,description,subtitle,metadata,*variants,*variants.calculated_price,*variants.options,+variants.inventory_quantity,+variants.manage_inventory,*options,*options.values,*images,*tags,*collection,*categories";

export type ListProductsArgs = {
  limit?: number;
  offset?: number;
  q?: string;
  category?: string | string[];
  collection?: string;
  tag?: string;
  order?: string;
  onSale?: boolean;
  // Server-side facet filters (Medusa Store API has no native equivalents).
  // Accept a single value (back-compat) or an array for multi-select
  // (e.g. size=["S","M"] = size S OR size M). Within a facet = OR;
  // across facets (size AND color) = AND.
  size?: string | string[];
  color?: string | string[];
  priceMin?: number;
  priceMax?: number;
  // Sort price asc/desc client-side after fetch — Medusa Store API doesn't
  // sort by computed `calculated_price` reliably, so when this is set we
  // page through results and re-sort.
  sortPrice?: "asc" | "desc";
  // When true, do not strip `metadata.unlisted` products. Used by the
  // private-unlock catalog. Defaults to false.
  unlocked?: boolean;
};

export async function listProducts(args: ListProductsArgs = {}) {
  return cachedListProducts(normalizeListProductArgs(args));
}

const cachedListProducts = unstable_cache(
  async (args: ListProductsArgs) => listProductsUncached(args),
  ["store-products-v2"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: 60 },
);

async function listProductsUncached(args: ListProductsArgs = {}) {
  const region = await getRegion();
  // All listings — including `q` search — route through the wide-fetch path.
  // Medusa Store API's `q` is a single-substring ILIKE on title/handle/description,
  // so "red dress" finds nothing in a catalog whose titles are "White Dress" with
  // a red color variant, or "Cute Red Floral Dress" (word order). Tokenized search
  // runs in-memory across title + handle + category + tag + variant.option.value.
  return listWithFacetFilters(args, region);
}

// Multi-select args may arrive as a comma-string ("S,M"), an array, or a
// single value. Normalize to a sorted, deduped string[] so cache keys are
// stable regardless of how the caller passed the value. Returns undefined
// when the input is empty so an unset filter doesn't generate a distinct
// cache entry.
function normalizeMultiArg(
  v: string | string[] | undefined,
): string[] | undefined {
  if (v == null) return undefined;
  const raw = Array.isArray(v) ? v : String(v).split(",");
  const cleaned = raw
    .map((s) => s.trim())
    .filter(Boolean);
  if (!cleaned.length) return undefined;
  return [...new Set(cleaned)].sort();
}

// Build a canonical lookup Set from a multi-select arg (string | string[] | undefined).
// Returns undefined when the input is empty so callers can short-circuit the filter.
// `canon` reduces messy spellings ("burgandy"/"Burgundy") to a single bucket;
// values that don't canonicalize are kept as-is so unknown sizes still work.
function toTargetSet(
  v: string | string[] | undefined,
  canon: (raw: string) => string | null,
): Set<string> | null {
  const arr = normalizeMultiArg(v);
  if (!arr) return null;
  const out = new Set<string>();
  for (const s of arr) {
    const c = canon(s) ?? s;
    if (c) out.add(c);
  }
  return out.size ? out : null;
}

function normalizeListProductArgs(args: ListProductsArgs): ListProductsArgs {
  return {
    limit: args.limit,
    offset: args.offset,
    q: args.q,
    category: Array.isArray(args.category)
      ? [...args.category].sort()
      : args.category,
    collection: args.collection,
    tag: args.tag,
    order: args.order,
    onSale: args.onSale,
    size: normalizeMultiArg(args.size),
    color: normalizeMultiArg(args.color),
    priceMin: args.priceMin,
    priceMax: args.priceMax,
    sortPrice: args.sortPrice,
    unlocked: args.unlocked,
  };
}

// Unified facet filter: Medusa Store API has no native filters for on-sale,
// option values (size/color), price range, or tokenized search across variant
// options. We read the shared catalog snapshot and apply every filter —
// category / tag / collection / order included — in memory. Cheap on a
// ~500-product catalog, and the snapshot is reused across listProducts,
// getShopFacets, and getCategoryHandlesWithStock so the page renders without
// re-fetching the catalog per concern.
//
// `q` is parsed locally rather than forwarded to Medusa: Store API's `q` is a
// single-substring ILIKE on title/handle/description, so multi-word queries
// like "red dress" return zero rows when titles are "White Dress" with a red
// color variant or "Cute Red Floral Dress" (word order mismatch). The
// tokenized matcher below covers all of those.
async function listWithFacetFilters(
  args: ListProductsArgs,
  region: Awaited<ReturnType<typeof getRegion>>,
) {
  const all = await cachedAllStoreProducts(region.id);

  // Exclude pre-order products from the in-stock storefront.
  // These are served at /preorder/* and must not appear in /shop or homepage listings.
  // NOTE: count may be slightly inaccurate for in-stock pagination on catalogs where
  // many products are flagged is_preorder, but this is acceptable for Phase 1 (small catalog).
  let filtered: HttpTypes.StoreProduct[] = all.filter(
    (p) =>
      (p.metadata as Record<string, unknown> | null | undefined)?.is_preorder !== true,
  );

  if (args.category) {
    const ids = new Set(Array.isArray(args.category) ? args.category : [args.category]);
    filtered = filtered.filter((p) =>
      (p.categories ?? []).some((c) => ids.has(c.id)),
    );
  }
  if (args.collection) {
    filtered = filtered.filter((p) => getProductCollectionId(p) === args.collection);
  }
  if (args.tag) {
    filtered = filtered.filter((p) => (p.tags ?? []).some((t) => t.id === args.tag));
  }
  // Honour `-created_at` here (the only order key callers use). Skip when a
  // price re-sort will run later, since that overrides the order anyway.
  if (args.order === "-created_at" && !args.sortPrice) {
    filtered = [...filtered].sort(
      (a, b) => getProductCreatedAt(b) - getProductCreatedAt(a),
    );
  }

  // Smart query parse: pulls size keywords ("small", "S", "free size") out as
  // an exact size filter, drops noise words ("size", "color", "in", "with",
  // "and"), then text-matches the remainder against title, handle, category,
  // tag, variant title/sku, variant option values (canonicalized for color, so
  // "burgundy" matches the misspelled "Burgandy" variant), and the manual
  // `metadata.search_terms` enrichment field.
  if (args.q) {
    const parsed = parseSearchQuery(args.q);
    if (parsed.sizes.length > 0 || parsed.textTokens.length > 0) {
      filtered = filtered.filter((p) => productMatchesParsedQuery(p, parsed));
    }
  }

  // Strip `metadata.unlisted=true` BEFORE pagination slicing so categories
  // with many hidden products still return a full per-page window of public
  // products. The private-unlock catalog passes `unlocked: true` to retain
  // them.
  if (!args.unlocked) {
    filtered = filtered.filter(
      (p) =>
        !isUnlisted(p as unknown as { metadata?: unknown }),
    );
  }

  // Hide products where every variant is out of stock. Keep the product if
  // at least one variant has inventory (size/color the shopper can still buy).
  filtered = filtered.filter((p) =>
    (p.variants ?? []).some((v) => isVariantInStock(v)),
  );

  if (args.onSale) {
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) => {
        if (!isVariantInStock(v)) return false;
        const cp = readCalculatedPrice(v);
        const c = cp?.calculated_amount;
        const o = cp?.original_amount;
        return typeof c === "number" && typeof o === "number" && c < o;
      }),
    );
  }

  const sizeTargets = toTargetSet(args.size, (v) => canonicalSize(v) ?? v);
  if (sizeTargets) {
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) =>
        isVariantInStock(v) &&
        (v.options ?? []).some(
          (o) =>
            isSizeOption(o) &&
            sizeTargets.has(canonicalSize(o.value ?? "") ?? ""),
        ),
      ),
    );
  }

  const colorTargets = toTargetSet(args.color, (v) => canonicalColor(v));
  if (colorTargets) {
    filtered = filtered.filter((p) =>
      (p.variants ?? []).some((v) =>
        isVariantInStock(v) &&
        (v.options ?? []).some(
          (o) =>
            isColorOption(o) &&
            colorTargets.has(canonicalColor(o.value ?? "") ?? ""),
        ),
      ),
    );
  }

  if (args.priceMin != null || args.priceMax != null) {
    const lo = args.priceMin ?? -Infinity;
    const hi = args.priceMax ?? Infinity;
    filtered = filtered.filter((p) => {
      const amounts = (p.variants ?? [])
        .filter((v) => isVariantInStock(v))
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

// Words that carry no search intent on their own — they're verbal glue around
// real attributes ("dress IN size small", "lingerie WITH lace"). Removed
// before matching so the user can type natural phrases.
const SEARCH_NOISE_WORDS = new Set([
  "size", "color", "colour",
  "in", "with", "and", "&",
  "the", "a", "an",
  "of", "for", "to",
]);

// Multi-word phrases (matched before tokenization) that resolve to a canonical
// size. Lets "free size" or "extra small" stay together instead of splitting
// into individual tokens that match nothing.
const SIZE_PHRASE_MAP: Array<[RegExp, string]> = [
  [/\bfree\s+size\b/, "Free Size"],
  [/\bone\s+size\b/, "Free Size"],
  [/\bextra\s+small\b/, "XS"],
  [/\bextra\s+large\b/, "XL"],
];

// Single tokens that resolve directly to a canonical size. "small" → S,
// "xxl" → 2XL, etc. Distinct from the general SIZE_ALIASES used by the
// facet filter because some short tokens like "s" are too noisy to treat
// as a size unless the user already typed an explicit shape hint — but the
// shop search is intent-led, so we lean inclusive here.
const SIZE_WORD_MAP: Record<string, string> = {
  small: "S", medium: "M", large: "L",
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL",
  "2xl": "2XL", xxl: "2XL", "3xl": "3XL", xxxl: "3XL", "4xl": "4XL",
  freesize: "Free Size", "free-size": "Free Size",
  onesize: "Free Size", "one-size": "Free Size",
};

type ParsedSearchQuery = {
  sizes: string[];
  textTokens: string[];
};

function parseSearchQuery(q: string): ParsedSearchQuery {
  let normalized = q.toLowerCase();
  const sizes: string[] = [];

  // Extract multi-word size phrases first so they don't break apart.
  for (const [pattern, code] of SIZE_PHRASE_MAP) {
    if (pattern.test(normalized)) {
      sizes.push(code);
      normalized = normalized.replace(pattern, " ");
    }
  }

  const rawTokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const textTokens: string[] = [];
  for (const token of rawTokens) {
    if (SEARCH_NOISE_WORDS.has(token)) continue;
    const sizeCode = SIZE_WORD_MAP[token];
    if (sizeCode) {
      sizes.push(sizeCode);
      continue;
    }
    textTokens.push(token);
  }

  return {
    sizes: [...new Set(sizes)],
    textTokens,
  };
}

function productMatchesParsedQuery(
  p: HttpTypes.StoreProduct,
  parsed: ParsedSearchQuery,
): boolean {
  // Size filter: every parsed size must exist among the product's variant size options.
  if (parsed.sizes.length > 0) {
    const productSizes = new Set<string>();
    for (const v of p.variants ?? []) {
      for (const o of v.options ?? []) {
        if (isSizeOption(o)) {
          const canon = canonicalSize(o.value ?? "");
          if (canon) productSizes.add(canon);
        }
      }
    }
    if (!parsed.sizes.every((s) => productSizes.has(s))) return false;
  }

  if (parsed.textTokens.length === 0) return true;

  const haystack: string[] = [];
  if (p.title) haystack.push(p.title.toLowerCase());
  if (p.handle) haystack.push(p.handle.toLowerCase());
  for (const c of p.categories ?? []) {
    if (c.name) haystack.push(c.name.toLowerCase());
    if (c.handle) haystack.push(c.handle.toLowerCase());
  }
  for (const t of p.tags ?? []) {
    const v = (t as { value?: string | null }).value;
    if (v) haystack.push(v.toLowerCase());
  }
  for (const v of p.variants ?? []) {
    if (v.title) haystack.push(v.title.toLowerCase());
    if (v.sku) haystack.push(v.sku.toLowerCase());
    for (const o of v.options ?? []) {
      const val = (o as { value?: string | null }).value;
      if (!val) continue;
      const lc = val.toLowerCase();
      haystack.push(lc);
      // Push canonicalized color so "burgundy" matches a "Burgandy" variant
      // even though the raw spelling differs.
      if (isColorOption(o)) {
        const canon = canonicalColor(lc);
        if (canon) haystack.push(canon);
      }
    }
  }

  // Manual enrichment: products can opt-in extra search terms via
  // metadata.search_terms (string with commas/pipes, or string[]). Lets the
  // admin tag a "White Dress" with `metadata.search_terms = "white, satin"`
  // for products where neither title nor variants carry the color word.
  const meta = (p.metadata ?? {}) as { search_terms?: unknown };
  if (typeof meta.search_terms === "string" && meta.search_terms.trim()) {
    for (const term of meta.search_terms.split(/[,|]/)) {
      const t = term.trim().toLowerCase();
      if (t) haystack.push(t);
    }
  } else if (Array.isArray(meta.search_terms)) {
    for (const term of meta.search_terms) {
      if (typeof term === "string") {
        const t = term.trim().toLowerCase();
        if (t) haystack.push(t);
      }
    }
  }

  return parsed.textTokens.every((token) =>
    haystack.some((field) => field.includes(token)),
  );
}

type PriceRecord = {
  calculated_amount?: number | null;
  original_amount?: number | null;
} | null;

function readCalculatedPrice(v: HttpTypes.StoreProductVariant): PriceRecord {
  return (v as { calculated_price?: PriceRecord }).calculated_price ?? null;
}

function lowestPrice(p: HttpTypes.StoreProduct): number | null {
  const amounts = (p.variants ?? [])
    .filter((v) => isVariantInStock(v))
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
  const cacheKey = JSON.stringify({
    q: args.q ?? "",
    category: Array.isArray(args.category)
      ? [...args.category].sort()
      : args.category ?? "",
    tag: args.tag ?? "",
    onSale: args.onSale ? 1 : 0,
  });
  return cachedShopFacets(cacheKey, args);
}

// Facets are derived from the product snapshot, so keep their TTL and tags
// aligned with product invalidation. Otherwise the sidebar can advertise
// stale sizes/colors/prices for up to a day after stock changes.
const cachedShopFacets = unstable_cache(
  (_key: string, args: {
    q?: string;
    category?: string | string[];
    tag?: string;
    onSale?: boolean;
  }) => computeShopFacets(args),
  ["shop-facets"],
  {
    tags: [SHOP_FACETS_CACHE_TAG, PRODUCTS_CACHE_TAG],
    revalidate: CATALOG_REVALIDATE_SECONDS,
  },
);

async function computeShopFacets(args: {
  q?: string;
  category?: string | string[];
  tag?: string;
  onSale?: boolean;
}): Promise<ShopFacets> {
  const region = await getRegion();
  // Reads the shared catalog snapshot; category/tag/q/onSale are applied in
  // memory so the sidebar facets match the grid the customer is actually
  // seeing.
  const all = await cachedAllStoreProducts(region.id);

  let scoped: HttpTypes.StoreProduct[] = all.filter((p) => {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    return (
      meta.is_preorder !== true &&
      !isUnlisted(p as unknown as { metadata?: unknown }) &&
      (p.variants ?? []).some((v) => isVariantInStock(v))
    );
  });
  if (args.category) {
    const ids = new Set(Array.isArray(args.category) ? args.category : [args.category]);
    scoped = scoped.filter((p) =>
      (p.categories ?? []).some((c) => ids.has(c.id)),
    );
  }
  if (args.tag) {
    scoped = scoped.filter((p) => (p.tags ?? []).some((t) => t.id === args.tag));
  }
  if (args.q) {
    const parsed = parseSearchQuery(args.q);
    if (parsed.sizes.length > 0 || parsed.textTokens.length > 0) {
      scoped = scoped.filter((p) => productMatchesParsedQuery(p, parsed));
    }
  }
  if (args.onSale) {
    scoped = scoped.filter((p) =>
      (p.variants ?? []).some((v) => {
        if (!isVariantInStock(v)) return false;
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

// Compact per-product facet index for the client. Used by the optimistic
// filter on /shop — the browser fetches /shop/facets.json once, then can
// instantly tell which products would match a size/color/price/onSale
// selection without waiting for an RSC round-trip. Only canonical sizes
// (S/M/L/...) and canonical colors are emitted so the payload matches what
// the filter UI offers.
export type ProductFacetEntry = {
  id: string;
  sizes: string[];   // canonical (S, M, L, XL, 2XL, ...)
  colors: string[];  // canonical color bucket
  price: number;     // lowest in-stock variant price; 0 if none
  onSale: boolean;   // any in-stock variant with calculated < original
};

export type ProductFacetIndex = {
  // Map from product id → its facet entry. Stored as array on the wire so
  // JSON stays compact and ordering matches the grid.
  entries: ProductFacetEntry[];
  // Bookkeeping so the client can validate the snapshot hasn't gone stale
  // relative to what the SSR grid shipped.
  generatedAt: number;
};

export async function getProductFacetIndex(): Promise<ProductFacetIndex> {
  return cachedProductFacetIndex();
}

const cachedProductFacetIndex = unstable_cache(
  async (): Promise<ProductFacetIndex> => {
    const region = await getRegion();
    const all = await cachedAllStoreProducts(region.id);
    const entries: ProductFacetEntry[] = [];
    for (const p of all) {
      // Skip preorder + unlisted — they aren't on /shop.
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      if (meta.is_preorder === true) continue;
      if (isUnlisted(p as unknown as { metadata?: unknown })) continue;
      const sizes = new Set<string>();
      const colors = new Set<string>();
      let lowest = Infinity;
      let onSale = false;
      for (const v of p.variants ?? []) {
        if (!isVariantInStock(v)) continue;
        for (const o of v.options ?? []) {
          if (isSizeOption(o)) {
            const c = canonicalSize(o.value ?? "");
            if (c) sizes.add(c);
          }
          if (isColorOption(o)) {
            const c = canonicalColor(o.value ?? "");
            if (c) colors.add(c);
          }
        }
        const cp = readCalculatedPrice(v);
        const amt = cp?.calculated_amount;
        if (typeof amt === "number") {
          if (amt < lowest) lowest = amt;
          const orig = cp?.original_amount;
          if (typeof orig === "number" && amt < orig) onSale = true;
        }
      }
      if (lowest === Infinity) continue; // entirely out of stock
      entries.push({
        id: p.id,
        sizes: [...sizes],
        colors: [...colors],
        price: Math.round(lowest),
        onSale,
      });
    }
    return { entries, generatedAt: Date.now() };
  },
  ["product-facet-index-v1"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

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

const cachedProductByHandle = unstable_cache(
  async (handle: string) => {
    const region = await getRegion();
    const { products } = await listStoreProducts({
      handle,
      region_id: region.id,
      fields: PRODUCT_DETAIL_FIELDS,
      limit: 1,
    });
    return { product: products?.[0] ?? null, region };
  },
  ["product-by-handle-v2"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: 60 },
);

export async function getProductByHandle(handle: string) {
  return cachedProductByHandle(handle);
}

const cachedCategories = unstable_cache(
  async () => {
    const { product_categories } = await sdk.store.category.list({
      fields: "id,name,handle,parent_category_id",
      limit: 100,
    });
    return product_categories ?? [];
  },
  ["product-categories-v1"],
  { tags: [PRODUCT_CATEGORIES_CACHE_TAG], revalidate: 600 },
);

export async function listCategories() {
  return cachedCategories();
}

// Returns the set of category handles that contain at least one publicly-listed,
// in-stock product. Ancestor handles are included too: if "dresses" has stock,
// "clothing" and "women" come along so the parent stays visible in nav/sidebar.
// Used to hide empty categories from the header menu and shop filter sidebar.
export async function getCategoryHandlesWithStock(): Promise<Set<string>> {
  return new Set(await cachedCategoryHandlesWithStock());
}

const cachedCategoryHandlesWithStock = unstable_cache(
  async (): Promise<string[]> => {
    const region = await getRegion();
    // Reads the shared catalog snapshot — the per-caller wide fetch this used
    // to do is now consolidated into cachedAllStoreProducts.
    const all = await cachedAllStoreProducts(region.id);

    const categories = await cachedCategories();
    const parentById = new Map<string, string | null>();
    const handleById = new Map<string, string>();
    const idByHandle = new Map<string, string>();
    for (const c of categories) {
      parentById.set(c.id, c.parent_category_id);
      handleById.set(c.id, c.handle);
      idByHandle.set(c.handle, c.id);
    }

    const stocked = new Set<string>();
    const markWithAncestors = (handle: string) => {
      if (stocked.has(handle)) return;
      stocked.add(handle);
      const id = idByHandle.get(handle);
      if (!id) return;
      let parentId = parentById.get(id) ?? null;
      while (parentId) {
        const parentHandle = handleById.get(parentId);
        if (!parentHandle || stocked.has(parentHandle)) break;
        stocked.add(parentHandle);
        parentId = parentById.get(parentId) ?? null;
      }
    };

    for (const p of all) {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      if (meta.is_preorder === true) continue;
      if (isUnlisted(p as unknown as { metadata?: unknown })) continue;
      const hasStock = (p.variants ?? []).some((v) => isVariantInStock(v));
      if (!hasStock) continue;
      for (const c of p.categories ?? []) {
        if (c?.handle) markWithAncestors(c.handle);
      }
    }
    return [...stocked];
  },
  ["category-handles-with-stock-v2"],
  // 5 min — stock barely moves faster than that and the cache auto-busts on
  // `revalidateTag(PRODUCTS_CACHE_TAG)` whenever a product mutates.
  { tags: [PRODUCTS_CACHE_TAG], revalidate: 300 },
);

export async function listCollections() {
  const { collections } = await sdk.store.collection.list({
    fields: "id,title,handle",
    limit: 100,
  });
  return collections ?? [];
}

type ProductTag = { id: string; value: string };

const cachedProductTags = unstable_cache(
  async (): Promise<ProductTag[]> => {
    const res = await sdk.client.fetch<{
      product_tags: ProductTag[];
    }>("/store/product-tags", {
      method: "GET",
      query: { fields: "id,value", limit: 200 },
    });
    return res.product_tags ?? [];
  },
  ["product-tags-v1"],
  { tags: [PRODUCT_TAGS_CACHE_TAG], revalidate: 300 },
);

function listProductTags(): Promise<ProductTag[]> {
  return cachedProductTags();
}

/**
 * Resolves a product-tag value (e.g. "winter") to its Medusa tag id, used by
 * shop filtering. Returns null if no tag matches.
 */
export async function getTagIdByValue(value: string): Promise<string | null> {
  const target = value.trim().toLowerCase();
  if (!target) return null;
  for (const t of await listProductTags()) {
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
  let best: { id: string; value: string; n: number } | null = null;
  for (const t of await listProductTags()) {
    const m = /^collection(\d+)$/i.exec(t.value);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!best || n > best.n) best = { id: t.id, value: t.value, n };
  }
  return best ? { id: best.id, value: best.value } : null;
}

// Hero bento — surfaces the latest drop with category variety. We take the
// newest HERO_PER_CATEGORY_POOL items from each hero category (dresses, bikini /
// beachwear, lingerie), combine them, and shuffle-pick HERO_TILE_COUNT tiles so
// the mix re-rolls every 60s with the ISR cache. Ordering by created_at keeps it
// anchored to the most recent batch; intentionally NOT tag-gated (see
// getLatestCollectionTag — fresh imports often arrive untagged).
const HERO_TILE_COUNT = 5;
const HERO_PER_CATEGORY_POOL = 5;
const HERO_CATEGORY_HANDLES = ["dresses", "beachwear", "lingerie"] as const;

async function resolveCategoryIds(handle: string): Promise<string[]> {
  const all = await listCategories();
  const root = all.find((c) => c.handle?.toLowerCase() === handle);
  if (!root) return [];
  return expandCategoryWithDescendants(root.id, all);
}

function shuffleAndPick<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Returns products for the hero bento: the newest HERO_PER_CATEGORY_POOL items
 * from each hero category (dresses, bikini/beachwear, lingerie), combined and
 * shuffle-picked to HERO_TILE_COUNT so the hero features the latest drop with
 * category variety and re-rolls every 60s with the ISR cache.
 */
const cachedFeaturedProducts = unstable_cache(
  async () => listFeaturedUncached(),
  ["home-featured-products-v1"],
  {
    tags: [PRODUCTS_CACHE_TAG, PRODUCT_TAGS_CACHE_TAG, PRODUCT_CATEGORIES_CACHE_TAG],
    revalidate: 60,
  },
);

export async function listFeatured(): Promise<HttpTypes.StoreProduct[]> {
  return cachedFeaturedProducts();
}

async function listFeaturedUncached(): Promise<HttpTypes.StoreProduct[]> {
  const catIdsByHandle = await Promise.all(
    HERO_CATEGORY_HANDLES.map((h) =>
      resolveCategoryIds(h).catch(() => [] as string[]),
    ),
  );

  // Newest items per hero category, in parallel. Descendant categories are
  // folded in via resolveCategoryIds, so e.g. "lingerie" matches its children.
  const pools = await Promise.all(
    catIdsByHandle.map(async (catIds) => {
      if (catIds.length === 0) return [] as HttpTypes.StoreProduct[];
      try {
        const res = await listProducts({
          category: catIds,
          order: "-created_at",
          limit: HERO_PER_CATEGORY_POOL,
        });
        return res.products;
      } catch {
        return [] as HttpTypes.StoreProduct[];
      }
    }),
  );

  // Combine the per-category pools, dedupe, and drop thumbnail-less products
  // (a tile with no image renders blank), then shuffle-pick the hero tiles.
  const seen = new Set<string>();
  const pool: HttpTypes.StoreProduct[] = [];
  for (const products of pools) {
    for (const p of products) {
      if (seen.has(p.id)) continue;
      if (!(p.thumbnail ?? p.images?.[0]?.url)) continue;
      seen.add(p.id);
      pool.push(p);
    }
  }

  return shuffleAndPick(pool, HERO_TILE_COUNT);
}

// Babe Essentials products — hand-curated by handle. Order matters: index 0 is
// the big hero/portrait tile; the rest fill the small tiles + wide bottom.
// Edit this list to swap which products appear in the home page mosaic.
const ESSENTIALS_HANDLES = ["is2382", "is1362", "is1361", "is522"];

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

const MYSTERY_BOX_POOL_LIMIT = 200;

export async function listInStockProductsForSizes(
  sizes: CanonicalSize[],
  regionId: string,
): Promise<Partial<Record<CanonicalSize, MysteryBoxSlot[]>>> {
  const uniqueSizes = [...new Set(sizes)];
  const sizeSet = new Set<string>(uniqueSizes);
  const pools = Object.fromEntries(
    uniqueSizes.map((size) => [size, [] as MysteryBoxSlot[]]),
  ) as Partial<Record<CanonicalSize, MysteryBoxSlot[]>>;

  if (uniqueSizes.length === 0) return pools;

  const { products } = await listStoreProducts({
    region_id: regionId,
    limit: MYSTERY_BOX_POOL_LIMIT,
    fields:
      "id,title,handle,thumbnail,discountable,metadata," +
      "*categories," +
      "variants.id,variants.sku,variants.title,+variants.inventory_quantity," +
      "+variants.manage_inventory,variants.metadata," +
      "variants.calculated_price.calculated_amount," +
      "variants.options.value",
  });

  for (const product of products) {
    if (product.discountable === false) continue;
    // Mystery box must never pick Intimates products or unlisted items.
    if (isInIntimatesCategory(product as unknown as { categories?: Array<{ handle?: string | null }> })) continue;
    if (isUnlisted(product as unknown as { metadata?: unknown })) continue;

    for (const rawVariant of product.variants ?? []) {
      const variant = rawVariant as HttpTypes.StoreProductVariant & {
        inventory_quantity?: number | null;
      };

      if (variant.manage_inventory) {
        const qty = Number(variant.inventory_quantity ?? 0);
        if (!Number.isFinite(qty) || qty < 1) continue;
      }

      const size = (variant.options ?? [])
        .map((option) => canonicalSize(option.value ?? ""))
        .find(
          (value): value is CanonicalSize =>
            typeof value === "string" && sizeSet.has(value),
        );
      if (!size) continue;

      const price = Number(
        variant.calculated_price?.calculated_amount ?? 0,
      );
      if (!Number.isFinite(price) || price <= 0) continue;

      pools[size]?.push({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku ?? product.handle ?? product.id,
        title: product.title ?? "Untitled",
        size,
        thumbnail: pickVariantThumbnail(variant.metadata) ?? product.thumbnail ?? null,
        price_mur: Math.floor(price),
        available_quantity: variant.manage_inventory
          ? Math.max(0, Math.floor(Number(variant.inventory_quantity ?? 0)))
          : null,
      });
    }
  }

  return pools;
}

export async function listInStockProductsForSize(
  size: CanonicalSize,
  regionId: string,
): Promise<MysteryBoxSlot[]> {
  const pools = await listInStockProductsForSizes([size], regionId);
  return pools[size] ?? [];
}

// Variants are imported with `metadata.image_urls` (see
// inventory-audit/scripts/import-medusa.ts) — the first entry is the cover.
// Falling back to product.thumbnail makes every variant of IS1160 look like
// the white version, so prefer the variant image when present.
function pickVariantThumbnail(metadata: unknown): string | null {
  const urls = (metadata as { image_urls?: unknown } | null | undefined)
    ?.image_urls;
  if (!Array.isArray(urls)) return null;
  const first = urls.find(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
  return first ?? null;
}
