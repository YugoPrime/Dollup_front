import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductByHandle, listProducts, getLatestCollectionTag } from "@/lib/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuy } from "@/components/product/ProductBuy";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { StickyATC } from "@/components/product/StickyATC";

export const revalidate = 60;

type RouteParams = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.description ?? product.subtitle ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: RouteParams }) {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) notFound();

  // "You may also like" pulls a random sample from the catalog (per user request:
  // not just same-category). Fetch a wide pool, shuffle, take 5.
  let related: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  let latestTag: string | null = null;
  try {
    const [pool, tag] = await Promise.all([
      listProducts({ limit: 60, order: "-created_at" }),
      getLatestCollectionTag().catch(() => null),
    ]);
    latestTag = tag?.value ?? null;
    related = pool.products
      .filter((p) => p.id !== product.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  } catch {
    // empty related is fine — section hides itself
  }

  return (
    <main>
      <nav aria-label="Breadcrumb" className="px-4 py-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted md:px-8 md:py-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span className="mx-1.5 text-blush-400">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-0 pb-8 md:grid-cols-[1fr_480px] md:gap-8 md:px-8 md:pb-12">
        <ProductGallery product={product} />
        <div className="px-4 md:sticky md:top-6 md:px-0" id="pdp-buy-anchor">
          <ProductBuy product={product} />
          <div className="mt-6">
            <ProductAccordion description={product.description ?? null} />
          </div>
        </div>
      </div>

      <YouMayAlsoLike products={related} latestCollectionTag={latestTag} />

      <StickyATC product={product} watchElementId="pdp-buy-anchor" />
    </main>
  );
}
