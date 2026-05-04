import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

function Tile({
  product,
  className,
  big = false,
}: {
  product: Product;
  className?: string;
  big?: boolean;
}) {
  const img = product.thumbnail ?? product.images?.[0]?.url;
  const price = getDisplayPrice(product);
  return (
    <Link
      href={`/products/${product.handle}`}
      className={`group relative block overflow-hidden rounded-xl bg-blush-100 shadow-[0_4px_10px_rgba(229,96,74,0.08)] transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.2)] ${className ?? ""}`}
    >
      {img && (
        <Image
          src={img}
          alt={product.title}
          fill
          sizes={big ? "(max-width: 768px) 100vw, 40vw" : "(max-width: 768px) 50vw, 20vw"}
          className="object-cover object-top"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
      <div className="absolute inset-x-3 bottom-3 text-white md:inset-x-4 md:bottom-4">
        <h3 className={`font-display leading-none ${big ? "text-[18px] md:text-[22px]" : "text-[14px] md:text-[18px]"}`}>
          {product.title}
        </h3>
        <p className="mt-1.5 font-sans text-[11px] font-bold opacity-95 md:text-[12px]">
          {formatPrice(price.amount, price.currency)}
        </p>
      </div>
    </Link>
  );
}

export function BabeEssentials({ products }: { products: Product[] }) {
  if (!products.length) return null;
  const [hero, ...rest] = products;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1100px] px-4 md:px-10">
        <header className="mb-6 text-center">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">★ Wardrobe heroes</p>
          <h2 className="font-display text-[28px] leading-none text-ink md:text-[36px]">
            Babe <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>essentials</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] font-sans text-[12px] leading-[1.5] text-ink-muted md:text-[14px]">
            The little extras that make every look hit harder.
          </p>
        </header>

        {/* Mobile: 1 big + 2 stacked + 1 wide */}
        <div className="grid grid-cols-2 gap-2 md:hidden" style={{ gridTemplateRows: "200px 200px 200px" }}>
          <Tile product={hero} className="col-span-2 row-start-1" big />
          {rest[0] && <Tile product={rest[0]} />}
          {rest[1] && <Tile product={rest[1]} />}
          {rest[2] && <Tile product={rest[2]} className="col-span-2" />}
        </div>

        {/* Desktop: 1 tall left + 2 top right + 1 wide bottom = 4 tiles */}
        <div className="hidden md:grid md:gap-3" style={{ gridTemplateColumns: "1.4fr 1fr 1fr", gridTemplateRows: "220px 220px" }}>
          <Tile product={hero} className="row-span-2" big />
          {rest[0] && <Tile product={rest[0]} />}
          {rest[1] && <Tile product={rest[1]} />}
          {rest[2] && <Tile product={rest[2]} className="col-span-2" />}
        </div>
      </div>
    </section>
  );
}
