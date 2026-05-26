import { unstable_cache } from "next/cache";
import type { HttpTypes } from "@medusajs/types";
import { listStoreProducts } from "@/lib/medusa";
import { getRegion } from "@/lib/region";
import { PRODUCTS_CACHE_TAG } from "@/lib/products";
import { isExcludedFromFeed, isUnlisted } from "@/lib/visibility";

// Google Merchant Center / Meta Commerce product feed. Same XML schema serves
// both: Meta's "Scheduled feed" data source accepts the Google Merchant RSS
// format unchanged, and connecting Google Shopping later requires no rebuild.
//
// One <item> per VARIANT. `g:id` = variant.id, `g:item_group_id` = product.id.
// This matches what /lib/analytics.ts sends as `content_ids` for ViewContent,
// AddToCart, and Purchase events — so Meta dynamic / Advantage+ catalog ads
// can match a Pixel event to a catalog row and retarget correctly.
//
// Setup (one-time, Meta side):
//   1. Commerce Manager → Catalogs → Create catalog (e-commerce)
//   2. Data Sources → Add data source → Use data feed → Scheduled feed
//   3. URL: https://<canonical-domain>/feed/meta.xml
//   4. Refresh: hourly (or daily) — schedule UTC at off-peak
//   5. Connect the catalog to the Pixel (NEXT_PUBLIC_META_PIXEL_ID)
//   6. Create an Advantage+ Catalog Ads campaign using this catalog
//
// Env:
//   NEXT_PUBLIC_SITE_URL  - canonical origin used for <link>. Defaults to
//                           https://dollupboutique.com (matches sitemap.ts).
//                           Override in Coolify to point at shop.dollupboutique.com
//                           pre-apex-cutover; flip back after.

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const PRODUCT_FEED_FIELDS =
  "id,title,handle,thumbnail,description,subtitle,metadata,updated_at," +
  "*variants,*variants.calculated_price,*variants.options," +
  "+variants.inventory_quantity,+variants.manage_inventory," +
  "variants.metadata,*options,*options.values,*images,*tags,*categories";

const BRAND = "Doll Up Boutique";
const CURRENCY = "MUR";
const DEFAULT_GOOGLE_CATEGORY = "Apparel & Accessories > Clothing";

// Medusa category handle → Google Merchant taxonomy path. Anything not in this
// map falls back to the generic apparel bucket above; Meta tolerates the
// fallback but matching is better when each item has a specific taxonomy.
const GOOGLE_CATEGORY_BY_HANDLE: Record<string, string> = {
  dresses: "Apparel & Accessories > Clothing > Dresses",
  tops: "Apparel & Accessories > Clothing > Shirts & Tops",
  shirts: "Apparel & Accessories > Clothing > Shirts & Tops",
  blouses: "Apparel & Accessories > Clothing > Shirts & Tops",
  bottoms: "Apparel & Accessories > Clothing > Pants",
  pants: "Apparel & Accessories > Clothing > Pants",
  trousers: "Apparel & Accessories > Clothing > Pants",
  jeans: "Apparel & Accessories > Clothing > Pants > Jeans",
  shorts: "Apparel & Accessories > Clothing > Shorts",
  skirts: "Apparel & Accessories > Clothing > Skirts",
  sets: "Apparel & Accessories > Clothing > Outfit Sets",
  "co-ords": "Apparel & Accessories > Clothing > Outfit Sets",
  coords: "Apparel & Accessories > Clothing > Outfit Sets",
  jumpsuits: "Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers",
  rompers: "Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers",
  outerwear: "Apparel & Accessories > Clothing > Outerwear",
  jackets: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  coats: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  loungewear: "Apparel & Accessories > Clothing > Sleepwear & Loungewear",
  sleepwear: "Apparel & Accessories > Clothing > Sleepwear & Loungewear",
  beachwear: "Apparel & Accessories > Clothing > Swimwear",
  swimwear: "Apparel & Accessories > Clothing > Swimwear",
  bikini: "Apparel & Accessories > Clothing > Swimwear",
  "bikini-sets": "Apparel & Accessories > Clothing > Swimwear",
  "one-pieces": "Apparel & Accessories > Clothing > Swimwear",
  "cover-ups": "Apparel & Accessories > Clothing > Swimwear",
  accessories: "Apparel & Accessories",
  bags: "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
  jewelry: "Apparel & Accessories > Jewelry",
  shoes: "Apparel & Accessories > Shoes",
};

function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  const fallback = "https://dollupboutique.com";
  const value = raw && raw.trim().length > 0 ? raw.trim() : fallback;
  return value.replace(/\/+$/, "");
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

type VariantLike = HttpTypes.StoreProductVariant & {
  inventory_quantity?: number | null;
  manage_inventory?: boolean | null;
  metadata?: unknown;
};

function variantInStock(v: VariantLike): boolean {
  if (!v.manage_inventory) return true;
  return (v.inventory_quantity ?? 0) > 0;
}

function variantPrice(
  v: HttpTypes.StoreProductVariant,
): { price: number; sale: number | null } | null {
  const cp = (v as {
    calculated_price?: {
      calculated_amount?: number | null;
      original_amount?: number | null;
    } | null;
  }).calculated_price;
  const calc = cp?.calculated_amount;
  const orig = cp?.original_amount;
  if (typeof calc !== "number" || !Number.isFinite(calc) || calc <= 0) return null;
  if (typeof orig === "number" && Number.isFinite(orig) && orig > calc) {
    return { price: orig, sale: calc };
  }
  return { price: calc, sale: null };
}

function optionValue(
  v: HttpTypes.StoreProductVariant,
  optionTitle: string,
): string | undefined {
  const target = optionTitle.toLowerCase();
  for (const o of v.options ?? []) {
    const title = (o as { option?: { title?: string | null } | null }).option?.title ?? "";
    if (title.toLowerCase() === target) {
      const val = (o as { value?: string | null }).value;
      if (val) return val;
    }
  }
  return undefined;
}

function variantImages(v: VariantLike, product: HttpTypes.StoreProduct): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | null | undefined) => {
    if (!u) return;
    if (!u.startsWith("https://")) return;
    if (seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };

  // Variant-level images (per inventory-audit import convention) take priority
  // so e.g. the green colourway shows the green photo, not the white product
  // thumbnail.
  const vMeta = (v.metadata ?? {}) as { image_urls?: unknown };
  if (Array.isArray(vMeta.image_urls)) {
    for (const u of vMeta.image_urls) {
      if (typeof u === "string") push(u);
    }
  }

  push(product.thumbnail ?? null);
  for (const img of product.images ?? []) {
    push(img.url);
  }

  // Meta accepts 1 main + up to 10 additional image links.
  return out.slice(0, 11);
}

function googleCategoryFor(product: HttpTypes.StoreProduct): string {
  for (const c of product.categories ?? []) {
    const handle = (c.handle ?? "").toLowerCase();
    if (GOOGLE_CATEGORY_BY_HANDLE[handle]) return GOOGLE_CATEGORY_BY_HANDLE[handle];
  }
  return DEFAULT_GOOGLE_CATEGORY;
}

function productTypeFor(product: HttpTypes.StoreProduct): string {
  const names = (product.categories ?? [])
    .map((c) => c.name)
    .filter((n): n is string => !!n && n.trim().length > 0);
  return names.length > 0 ? names.join(" > ") : "Women's Fashion";
}

async function fetchAllProducts(): Promise<HttpTypes.StoreProduct[]> {
  const region = await getRegion();
  const all: HttpTypes.StoreProduct[] = [];
  const limit = 100;
  const MAX_BATCHES = 20;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const res = await listStoreProducts({
      region_id: region.id,
      fields: PRODUCT_FEED_FIELDS,
      limit,
      offset: i * limit,
    });
    all.push(...res.products);
    if (res.products.length < limit) break;
  }
  return all;
}

const cachedFeed = unstable_cache(
  async (siteUrl: string): Promise<string> => buildFeed(siteUrl),
  ["meta-product-feed-v1"],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: 3600 },
);

async function buildFeed(siteUrl: string): Promise<string> {
  const products = await fetchAllProducts();
  const lastBuild = new Date().toUTCString();

  const items: string[] = [];

  for (const product of products) {
    if (isUnlisted(product as unknown as { metadata?: unknown })) continue;
    if (
      isExcludedFromFeed(
        product as unknown as { categories?: Array<{ handle?: string | null }> },
      )
    ) {
      continue;
    }
    if (!product.handle || !product.title) continue;

    const link = `${siteUrl}/products/${product.handle}`;
    const descSource = product.description ?? product.subtitle ?? product.title;
    const description = truncate(stripHtml(descSource), 4500);
    const googleCategory = googleCategoryFor(product);
    const productType = productTypeFor(product);

    for (const rawVariant of product.variants ?? []) {
      const variant = rawVariant as VariantLike;
      const prices = variantPrice(variant);
      if (!prices) continue;

      const images = variantImages(variant, product);
      const imageLink = images[0];
      if (!imageLink) continue;

      const sizeLabel = optionValue(variant, "size");
      const colorLabel = optionValue(variant, "color");
      const variantTitle = variant.title?.trim() || sizeLabel || "";
      const titleParts = [product.title];
      if (
        variantTitle &&
        variantTitle.toLowerCase() !== product.title.toLowerCase() &&
        !product.title.toLowerCase().includes(variantTitle.toLowerCase())
      ) {
        titleParts.push(variantTitle);
      }
      const fullTitle = truncate(titleParts.join(" – "), 150);

      const lines: string[] = [];
      lines.push(`<g:id>${xmlEscape(variant.id)}</g:id>`);
      lines.push(`<g:item_group_id>${xmlEscape(product.id)}</g:item_group_id>`);
      lines.push(`<g:title>${xmlEscape(fullTitle)}</g:title>`);
      lines.push(`<g:description>${xmlEscape(description)}</g:description>`);
      lines.push(`<g:link>${xmlEscape(link)}</g:link>`);
      lines.push(`<g:image_link>${xmlEscape(imageLink)}</g:image_link>`);
      for (const extra of images.slice(1)) {
        lines.push(`<g:additional_image_link>${xmlEscape(extra)}</g:additional_image_link>`);
      }
      lines.push(
        `<g:availability>${variantInStock(variant) ? "in_stock" : "out_of_stock"}</g:availability>`,
      );
      lines.push(`<g:condition>new</g:condition>`);
      lines.push(`<g:price>${prices.price.toFixed(2)} ${CURRENCY}</g:price>`);
      if (prices.sale != null) {
        lines.push(`<g:sale_price>${prices.sale.toFixed(2)} ${CURRENCY}</g:sale_price>`);
      }
      lines.push(`<g:brand>${xmlEscape(BRAND)}</g:brand>`);
      // No GTIN/UPC for boutique imports — telling Google there are no
      // unique product identifiers prevents the feed from being flagged
      // for missing GTIN.
      lines.push(`<g:identifier_exists>no</g:identifier_exists>`);
      if (variant.sku) {
        lines.push(`<g:mpn>${xmlEscape(variant.sku)}</g:mpn>`);
      }
      lines.push(
        `<g:google_product_category>${xmlEscape(googleCategory)}</g:google_product_category>`,
      );
      lines.push(`<g:product_type>${xmlEscape(productType)}</g:product_type>`);
      lines.push(`<g:gender>female</g:gender>`);
      lines.push(`<g:age_group>adult</g:age_group>`);
      if (sizeLabel) lines.push(`<g:size>${xmlEscape(sizeLabel)}</g:size>`);
      if (colorLabel) lines.push(`<g:color>${xmlEscape(colorLabel)}</g:color>`);

      items.push(`    <item>\n      ${lines.join("\n      ")}\n    </item>`);
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>${xmlEscape(BRAND)}</title>\n` +
    `    <link>${xmlEscape(siteUrl)}</link>\n` +
    `    <description>${xmlEscape(`Product feed for ${BRAND}`)}</description>\n` +
    `    <lastBuildDate>${lastBuild}</lastBuildDate>\n` +
    (items.length > 0 ? items.join("\n") + "\n" : "") +
    `  </channel>\n` +
    `</rss>\n`
  );
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const xml = await cachedFeed(siteUrl).catch((err) => {
    console.error("Meta feed build failed:", err);
    return null;
  });
  if (!xml) {
    return new Response("Feed temporarily unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
