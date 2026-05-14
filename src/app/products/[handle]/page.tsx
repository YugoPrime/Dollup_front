import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductByHandle, listProducts, getLatestCollectionTag } from "@/lib/products";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuy } from "@/components/product/ProductBuy";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { StickyATC } from "@/components/product/StickyATC";
import { getStoreConfig } from "@/lib/store-config";
import { splitProductDescription } from "@/lib/product-description";
import { isPrivateUnlocked } from "@/lib/private-unlock";
import {
  isAgeRestricted,
  isPubliclyListedStoreProduct,
} from "@/lib/visibility";
import { AgeGateModal } from "@/components/product/AgeGateModal";

export const revalidate = 60;
const SITE_URL = "https://dollupboutique.com";

type RouteParams = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) return { title: "Product not found" };
  const description = plainText(product.description ?? product.subtitle ?? "").slice(0, 155);
  const image = product.thumbnail ?? product.images?.[0]?.url ?? "/og-default.jpg";
  const canonical = `/products/${product.handle}`;

  const ageRestricted = isAgeRestricted(product as unknown as {
    metadata?: unknown;
    categories?: Array<{ handle?: string | null }> | null;
  });

  return {
    title: product.title,
    description: description || undefined,
    alternates: { canonical },
    // Intimates / age-restricted PDPs must never be indexed. The robots meta
    // tag plus the sitemap exclusion together keep Google away from these URLs.
    robots: ageRestricted
      ? { index: false, follow: false, nocache: true }
      : undefined,
    openGraph: ageRestricted
      ? undefined
      : {
          type: "website",
          title: product.title,
          description: description || undefined,
          url: canonical,
          images: [{ url: image, alt: product.title }],
        },
    twitter: ageRestricted
      ? undefined
      : {
          card: "summary_large_image",
          title: product.title,
          description: description || undefined,
          images: [image],
        },
  };
}

export default async function ProductPage({ params }: { params: RouteParams }) {
  const { handle } = await params;
  const [{ product }, cfg, unlocked] = await Promise.all([
    getProductByHandle(handle),
    getStoreConfig(),
    isPrivateUnlocked().catch(() => false),
  ]);
  if (!product) notFound();
  const productLike = product as unknown as {
    metadata?: unknown;
    categories?: Array<{ handle?: string | null }> | null;
  };
  // Unlisted products are still directly reachable by URL (per design), but
  // not when there's no unlock cookie. 404 keeps Google + curious visitors out.
  // Unlisted products 404 unless the visitor has the private-unlock cookie.
  // Intimates products always reach the PDP — the age gate handles the rest.
  if (!isPubliclyListedStoreProduct(product, { unlocked })) {
    notFound();
  }
  const ageRestricted = isAgeRestricted(productLike);
  const freeShippingThreshold = cfg.shipping.free_shipping_threshold_mur;
  const freeShippingLabel =
    freeShippingThreshold > 0
      ? formatPrice(freeShippingThreshold, "MUR")
      : "eligible orders";
  const { main: descriptionHtml, sizeChart: sizeChartHtml } =
    splitProductDescription(product.description ?? null);

  return (
    <div>
      {ageRestricted ? <AgeGateModal /> : null}
      {/* Skip Product / BreadcrumbList JSON-LD for age-restricted items —
          we don't want them appearing in Google's product knowledge graph. */}
      {ageRestricted ? null : (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(product)) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd(productBreadcrumbJsonLd(product)) }}
          />
        </>
      )}
      <nav aria-label="Breadcrumb" className="px-4 py-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted md:px-8 md:py-4">
        <Link href="/" className="hover:text-coral-500">Home</Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <Link href="/shop" className="hover:text-coral-500">Shop</Link>
        {product.categories?.[0] && (
          <>
            <span className="mx-1.5 text-blush-400">/</span>
            <Link
              href={`/shop?category=${encodeURIComponent(product.categories[0].handle)}`}
              className="hover:text-coral-500"
            >
              {product.categories[0].name}
            </Link>
          </>
        )}
        <span className="mx-1.5 text-blush-400">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-0 pb-8 md:grid-cols-[1fr_480px] md:gap-8 md:px-8 md:pb-12">
        <ProductGallery product={product} />
        <div className="px-4 md:sticky md:top-[140px] md:px-0" id="pdp-buy-anchor">
          <ProductBuy
            product={product}
            freeShippingThreshold={freeShippingThreshold}
            sizeChartHtml={sizeChartHtml}
          />
          <div className="mt-6">
            <ProductAccordion
              descriptionHtml={descriptionHtml}
              sizeChartHtml={sizeChartHtml}
              preorderEtaCopy={cfg.shipping.preorder_eta_copy}
              freeShippingLabel={freeShippingLabel}
            />
          </div>
        </div>
      </div>

      {ageRestricted ? null : (
        <Suspense fallback={null}>
          <RelatedProductsSection
            currentProductId={product.id}
            unlocked={unlocked}
          />
        </Suspense>
      )}

      <StickyATC product={product} watchElementId="pdp-buy-anchor" />
    </div>
  );
}

async function RelatedProductsSection({
  currentProductId,
  unlocked,
}: {
  currentProductId: string;
  unlocked: boolean;
}) {
  let related: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  let latestCollectionTag: string | null = null;

  try {
    const [pool, tag] = await Promise.all([
      listProducts({ limit: 16, order: "-created_at" }),
      getLatestCollectionTag().catch(() => null),
    ]);
    related = pool.products
      .filter((p) => p.id !== currentProductId)
      .filter((p) =>
        isPubliclyListedStoreProduct(p, { unlocked, excludeIntimates: true }),
      )
      .slice(0, 5);
    latestCollectionTag = tag?.value ?? null;
  } catch {
    return null;
  }

  return (
    <YouMayAlsoLike
      products={related}
      latestCollectionTag={latestCollectionTag}
    />
  );
}

function productJsonLd(product: NonNullable<Awaited<ReturnType<typeof getProductByHandle>>["product"]>) {
  const image = product.thumbnail ?? product.images?.[0]?.url;
  const variants = product.variants ?? [];
  const inStock = variants.some(
    (variant) => !variant.manage_inventory || (variant.inventory_quantity ?? 0) > 0,
  );
  const availability = inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const url = `${SITE_URL}/products/${product.handle}`;
  // Quote prices "valid until" 30 days out — gives Google rich-result eligibility
  // a fresh window without committing to a long-lived price guarantee.
  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const variantPrices = variants
    .map((v) => getDisplayPrice({ variants: [v] }).amount)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const fallbackPrice = getDisplayPrice(product).amount;
  const prices =
    variantPrices.length > 0
      ? variantPrices
      : typeof fallbackPrice === "number" && fallbackPrice > 0
        ? [fallbackPrice]
        : [];

  let offers: Record<string, unknown> | undefined;
  if (prices.length === 0) {
    offers = undefined;
  } else {
    const lowPrice = Math.min(...prices);
    const highPrice = Math.max(...prices);
    offers =
      lowPrice === highPrice
        ? {
            "@type": "Offer",
            url,
            priceCurrency: "MUR",
            price: lowPrice,
            priceValidUntil,
            availability,
            itemCondition: "https://schema.org/NewCondition",
          }
        : {
            "@type": "AggregateOffer",
            url,
            priceCurrency: "MUR",
            lowPrice,
            highPrice,
            offerCount: prices.length,
            priceValidUntil,
            availability,
            itemCondition: "https://schema.org/NewCondition",
          };
  }

  // Use a real variant SKU when there's exactly one; for multi-variant we omit
  // it at the product level since each variant would need its own Offer node
  // to map a SKU correctly.
  const productSku =
    variants.length === 1 ? (variants[0]?.sku ?? product.handle) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: image ? [image] : undefined,
    description: plainText(product.description ?? product.subtitle ?? ""),
    sku: productSku,
    brand: {
      "@type": "Brand",
      name: "Doll Up Boutique",
    },
    offers,
  };
}

function productBreadcrumbJsonLd(
  product: NonNullable<Awaited<ReturnType<typeof getProductByHandle>>["product"]>,
) {
  const category = product.categories?.[0];
  const items = [
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
  ];

  if (category && category.handle) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: category.name,
      item: `${SITE_URL}/shop?category=${encodeURIComponent(category.handle)}`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: product.title,
    item: `${SITE_URL}/products/${product.handle}`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
