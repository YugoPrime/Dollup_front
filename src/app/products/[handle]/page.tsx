import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductByHandle, listProducts, getLatestCollectionTag } from "@/lib/products";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuy } from "@/components/product/ProductBuy";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { StickyATC } from "@/components/product/StickyATC";
import { getStoreConfig } from "@/lib/store-config";

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

  return {
    title: product.title,
    description: description || undefined,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.title,
      description: description || undefined,
      url: canonical,
      images: [{ url: image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: description || undefined,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: { params: RouteParams }) {
  const { handle } = await params;
  const [{ product }, cfg] = await Promise.all([
    getProductByHandle(handle),
    getStoreConfig(),
  ]);
  if (!product) notFound();
  const freeShippingThreshold = cfg.shipping.free_shipping_threshold_mur;
  const freeShippingLabel =
    freeShippingThreshold > 0
      ? formatPrice(freeShippingThreshold, "MUR")
      : "eligible orders";

  // "You may also like" pulls a light sample from recent catalog items.
  let related: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  let latestTag: string | null = null;
  try {
    const [pool, tag] = await Promise.all([
      listProducts({ limit: 12, order: "-created_at" }),
      getLatestCollectionTag().catch(() => null),
    ]);
    latestTag = tag?.value ?? null;
    related = pool.products
      .filter((p) => p.id !== product.id)
      .slice(0, 5);
  } catch {
    // empty related is fine — section hides itself
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productBreadcrumbJsonLd(product)) }}
      />
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
        <div className="px-4 md:sticky md:top-6 md:px-0" id="pdp-buy-anchor">
          <ProductBuy
            product={product}
            freeShippingThreshold={freeShippingThreshold}
          />
          <div className="mt-6">
            <ProductAccordion
              description={product.description ?? null}
              preorderEtaCopy={cfg.shipping.preorder_eta_copy}
              freeShippingLabel={freeShippingLabel}
            />
          </div>
        </div>
      </div>

      <YouMayAlsoLike products={related} latestCollectionTag={latestTag} />

      <StickyATC product={product} watchElementId="pdp-buy-anchor" />
    </div>
  );
}

function productJsonLd(product: NonNullable<Awaited<ReturnType<typeof getProductByHandle>>["product"]>) {
  const price = getDisplayPrice(product);
  const image = product.thumbnail ?? product.images?.[0]?.url;
  const inStock = (product.variants ?? []).some(
    (variant) => !variant.manage_inventory || (variant.inventory_quantity ?? 0) > 0,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: image ? [image] : undefined,
    description: plainText(product.description ?? product.subtitle ?? ""),
    sku: product.handle,
    brand: {
      "@type": "Brand",
      name: "Doll Up Boutique",
    },
    offers:
      price.amount != null
        ? {
            "@type": "Offer",
            url: `${SITE_URL}/products/${product.handle}`,
            priceCurrency: "MUR",
            price: price.amount,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          }
        : undefined,
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
