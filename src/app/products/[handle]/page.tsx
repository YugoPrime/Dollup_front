import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductByHandle, listProducts } from "@/lib/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuy } from "@/components/product/ProductBuy";
import { ProductCard } from "@/components/ProductCard";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.description ?? product.subtitle ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) notFound();

  const category = product.categories?.[0] ?? null;

  let related: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  if (category) {
    try {
      const res = await listProducts({ limit: 5, category: category.id });
      related = res.products.filter((p) => p.id !== product.id).slice(0, 4);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-20 md:px-10">
      <nav className="flex items-center gap-2 py-7 font-sans text-xs text-ink-muted">
        <Link href="/" className="hover:text-coral-500">
          Home
        </Link>
        <span className="text-blush-400">/</span>
        {category && (
          <>
            <Link
              href={`/shop?category=${category.handle}`}
              className="hover:text-coral-500"
            >
              {category.name}
            </Link>
            <span className="text-blush-400">/</span>
          </>
        )}
        <span className="font-medium text-ink">{product.title}</span>
      </nav>

      <div className="mb-16 grid gap-12 md:grid-cols-2">
        <ProductGallery product={product} />

        <div className="pt-2">
          {category && (
            <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-500">
              {category.name}
            </p>
          )}
          <h1 className="mb-3 font-display text-4xl font-bold leading-tight text-ink">
            {product.title}
          </h1>
          <div className="mb-5 font-sans text-sm text-coral-500">
            ★★★★★{" "}
            <span className="ml-1 text-xs text-ink-muted">(42 reviews)</span>
          </div>
          <ProductBuy product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-blush-400 pt-12">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink">
            You may also like
          </h2>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
