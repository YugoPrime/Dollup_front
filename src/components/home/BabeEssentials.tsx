import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

// Per-handle homepage image override — kept separate from product.thumbnail so
// the PDP gallery isn't bound to whatever marketing shot we want on the bento.
const HOMEPAGE_IMAGE_OVERRIDES: Record<string, string> = {
  is2382: "https://cdn.dollupboutique.com/homepage/babe-essentials/is2382.jpg",
  is1362: "https://cdn.dollupboutique.com/homepage/babe-essentials/is1362.jpg",
  is1361: "https://cdn.dollupboutique.com/homepage/babe-essentials/is1361.jpg",
  is522: "https://cdn.dollupboutique.com/homepage/babe-essentials/is522.jpg",
};

function Tile({
  product,
  className,
  big = false,
}: {
  product: Product;
  className?: string;
  big?: boolean;
}) {
  const img =
    HOMEPAGE_IMAGE_OVERRIDES[product.handle ?? ""] ??
    product.thumbnail ??
    product.images?.[0]?.url;
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
          className="object-cover object-center"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
      <div className="absolute inset-x-3 bottom-3 text-white md:inset-x-4 md:bottom-4">
        <h3 className={`font-display leading-none ${big ? "text-[18px] md:text-[22px]" : "text-[14px] md:text-[18px]"}`}>
          {product.title}
        </h3>
        <p className="mt-1.5 font-sans text-[12px] font-bold opacity-95 md:text-[13px]">
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
          <p className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-coral-500">Wardrobe heroes</p>
          <h2 className="font-display text-[28px] leading-none text-ink md:text-[36px]">
            Babe <em className="not-italic text-coral-450" style={{ fontStyle: "italic" }}>essentials</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] font-sans text-[14px] leading-[1.5] text-ink-muted">
            The little extras that make every look hit harder.
          </p>
        </header>

        {/* One grid for both breakpoints (the previous mobile + desktop copies
            doubled every tile in the DOM, so screen readers announced each
            product twice).
            Mobile: 1 wide hero + 2 side by side + 1 wide.
            Desktop: hero tall on the left, 2 on top right, 1 wide bottom. */}
        <div className="grid grid-cols-2 grid-rows-[200px_200px_200px] gap-2 md:grid-cols-[1.4fr_1fr_1fr] md:grid-rows-[220px_220px] md:gap-3">
          <Tile
            product={hero}
            className="col-span-2 row-start-1 md:col-span-1 md:row-span-2"
            big
          />
          {rest[0] && <Tile product={rest[0]} />}
          {rest[1] && <Tile product={rest[1]} />}
          {rest[2] && <Tile product={rest[2]} className="col-span-2" />}
        </div>
      </div>
    </section>
  );
}
