import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import {
  listProducts,
  listCategories,
  expandCategoryWithDescendants,
} from "@/lib/products";
import { isPrivateUnlocked } from "@/lib/private-unlock";
import {
  INTIMATES_CATEGORY_HANDLE,
  isUnlisted,
} from "@/lib/visibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private collection",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PrivateCatalogPage() {
  const unlocked = await isPrivateUnlocked().catch(() => false);
  if (!unlocked) notFound();

  const allCategories = await listCategories();
  const intimatesCategory = allCategories.find(
    (c) => c.handle === INTIMATES_CATEGORY_HANDLE,
  );

  let intimatesProducts: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  if (intimatesCategory) {
    const ids = expandCategoryWithDescendants(
      intimatesCategory.id,
      allCategories,
    );
    const res = await listProducts({ category: ids, limit: 100 }).catch(() => ({
      products: [],
      count: 0,
      region: null,
    }));
    intimatesProducts = res.products;
  }

  // Sweep for `metadata.unlisted` items anywhere else in the catalog —
  // escape hatch so admin can mark any product unlisted without moving it.
  const allRes = await listProducts({ limit: 200, order: "-created_at" }).catch(
    () => ({ products: [], count: 0, region: null }),
  );
  const otherUnlisted = allRes.products.filter(
    (p) =>
      isUnlisted(p as unknown as { metadata?: unknown }) &&
      !intimatesProducts.some((ip) => ip.id === p.id),
  );

  const products = [...intimatesProducts, ...otherUnlisted];

  return (
    <div className="bg-cream px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-8 max-w-[680px]">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
            Private collection · 18+
          </p>
          <h1 className="mt-2 font-display text-[34px] leading-[1] text-ink md:text-[52px]">
            For trusted clients only
          </h1>
          <p className="mt-3 font-sans text-[13px] leading-relaxed text-ink-soft md:text-[14px]">
            You unlocked the private catalog with a shared link. Pieces here
            don&apos;t appear in /shop or in search. Your access stays on this
            device for 30 days — please don&apos;t share the URL publicly.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex font-sans text-[12px] text-ink-muted underline hover:text-coral-500"
          >
            ← Back to the public shop
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-blush-400 bg-white p-10 text-center">
            <p className="font-display text-[20px] text-ink">
              Nothing in the private collection yet.
            </p>
            <p className="mt-2 font-sans text-[12px] text-ink-muted">
              Add products to the &quot;Intimates&quot; category or flag any
              product with{" "}
              <code className="rounded bg-blush-100 px-1 text-[11px]">
                metadata.unlisted = true
              </code>{" "}
              in Medusa admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} latestCollectionTag={null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
