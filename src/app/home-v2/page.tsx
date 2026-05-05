import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { HttpTypes } from "@medusajs/types";
import {
  getCategoryIconImages,
  getLatestCollectionTag,
  listEssentials,
  listFeatured,
  listProducts,
} from "@/lib/products";
import { formatPrice, getDisplayPrice } from "@/lib/format";
import { salesOfMonthConfig } from "@/lib/sales-of-month";
import { ProductCard } from "@/components/ProductCard";
import {
  HERO_TILE_1_BLUR,
  HERO_TILE_2_BLUR,
  HERO_TILE_3_BLUR,
  HERO_TILE_4_BLUR,
} from "@/lib/blur-data";

type Product = HttpTypes.StoreProduct;

const HOME_V2_HERO_BLURS = [
  HERO_TILE_2_BLUR,
  HERO_TILE_3_BLUR,
  HERO_TILE_4_BLUR,
];

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Homepage V2",
  description: "Alternate Doll Up Boutique homepage for local UI comparison.",
};

const CATEGORY_LINKS = [
  {
    label: "New In",
    href: "/shop?sort=new",
    handle: null,
    kicker: "Latest drop",
  },
  {
    label: "Dresses",
    href: "/shop?category=dresses",
    handle: "dresses",
    kicker: "Date night",
  },
  {
    label: "Lingerie",
    href: "/shop?category=lingerie",
    handle: "lingerie",
    kicker: "Soft layers",
  },
  {
    label: "Beachwear",
    href: "/shop?category=beachwear",
    handle: "beachwear",
    kicker: "Island ready",
  },
  {
    label: "Accessories",
    href: "/shop?category=accessories",
    handle: "accessories",
    kicker: "Finishing touch",
  },
  {
    label: "Sale",
    href: "/shop?on_sale=1",
    handle: null,
    kicker: "Limited offers",
  },
];

const PROMISE_FALLBACK = {
  products: [] as Product[],
  count: 0,
  region: null!,
};

export default async function HomeV2Page() {
  const latestCollection = await getLatestCollectionTag().catch(() => null);

  const [featured, trendingRes, newArrivalsRes, saleRes, essentials, categoryImages] =
    await Promise.all([
      listFeatured().catch(() => [] as Product[]),
      listProducts({ tag: "trending", limit: 8 })
        .catch(() => listProducts({ order: "-created_at", limit: 8 }))
        .catch(() => PROMISE_FALLBACK),
      latestCollection
        ? listProducts({ tag: latestCollection.id, order: "-created_at", limit: 8 }).catch(
            () => PROMISE_FALLBACK,
          )
        : listProducts({ order: "-created_at", limit: 8 }).catch(() => PROMISE_FALLBACK),
      listProducts({ onSale: true, order: "-created_at", limit: 8 }).catch(
        () => PROMISE_FALLBACK,
      ),
      listEssentials().catch(() => [] as Product[]),
      getCategoryIconImages(["dresses", "lingerie", "beachwear", "accessories"]).catch(
        () => ({} as Record<string, string | null>),
      ),
    ]);
  const editorialProducts = prioritizeEditorialProducts([
    ...featured,
    ...newArrivalsRes.products,
    ...trendingRes.products,
    ...saleRes.products,
  ]);

  return (
    <div className="overflow-x-hidden">
      <CompareBar />
      <HomeV2Hero
        products={editorialProducts}
        latestCollectionTag={latestCollection?.value ?? null}
      />
      <TrustStrip />
      <ShopByCategory
        products={editorialProducts}
        saleProducts={prioritizeEditorialProducts(saleRes.products)}
        categoryImages={categoryImages}
      />
      <ProductSection
        eyebrow="Most wanted"
        title="Trending right now"
        href="/shop?sort=trending"
        products={trendingRes.products}
        latestCollectionTag={latestCollection?.value ?? null}
        tone="cream"
      />
      <SaleMoment products={prioritizeEditorialProducts(saleRes.products)} />
      <SplitShowcase
        products={prioritizeEditorialProducts(essentials)}
        fallbackProducts={editorialProducts}
        latestCollectionTag={latestCollection?.value ?? null}
      />
      <ProductSection
        eyebrow={latestCollection?.value ? latestCollection.value : "Fresh edit"}
        title="New pieces to try first"
        href={
          latestCollection?.value
            ? `/shop?tag=${encodeURIComponent(latestCollection.value)}`
            : "/shop?sort=new"
        }
        products={newArrivalsRes.products}
        latestCollectionTag={latestCollection?.value ?? null}
        tone="white"
      />
      <ProductSection
        eyebrow="Smart buys"
        title="Sale picks before they go"
        href="/shop?on_sale=1"
        products={saleRes.products}
        latestCollectionTag={latestCollection?.value ?? null}
        tone="ink"
      />
    </div>
  );
}

function prioritizeEditorialProducts(products: Product[]) {
  const withImages = dedupeProducts(products).filter((product) =>
    Boolean(product.thumbnail ?? product.images?.[0]?.url),
  );
  const editorial = withImages.filter(isEditorialProduct);
  const supporting = withImages.filter((product) => !isEditorialProduct(product));
  return [...editorial, ...supporting];
}

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function isEditorialProduct(product: Product) {
  const text = `${product.title ?? ""} ${product.handle ?? ""}`.toLowerCase();
  return !/(glue|adhesive|stocking|tape|pad|insert|cover)/.test(text);
}

function CompareBar() {
  return (
    <nav className="border-b border-blush-300 bg-white px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink md:px-8">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 md:justify-between">
        <span className="text-ink-muted">
          <span className="md:hidden">Compare</span>
          <span className="hidden md:inline">Local homepage compare</span>
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-blush-300 px-2.5 py-1.5 text-ink-soft transition-colors hover:border-coral-500 hover:text-coral-500 md:px-3"
          >
            <span className="md:hidden">A</span>
            <span className="hidden md:inline">Current</span>
          </Link>
          <span className="rounded-full bg-coral-500 px-2.5 py-1.5 text-white md:px-3">
            <span className="md:hidden">B</span>
            <span className="hidden md:inline">Version B</span>
          </span>
        </div>
      </div>
    </nav>
  );
}

function HomeV2Hero({
  products,
  latestCollectionTag,
}: {
  products: Product[];
  latestCollectionTag: string | null;
}) {
  const hero = products[0];
  const supporting = products.slice(1, 4);
  const image = hero?.thumbnail ?? hero?.images?.[0]?.url ?? null;
  const price = hero ? getDisplayPrice(hero) : null;

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      {image ? (
        <Image
          src={image}
          alt={hero?.title ?? "Doll Up Boutique new arrival"}
          fill
          sizes="100vw"
          priority
          className="z-[-2] object-cover object-top"
          placeholder="blur"
          blurDataURL={HERO_TILE_1_BLUR}
        />
      ) : null}
      <div className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(26,18,18,0.88),rgba(26,18,18,0.56)_46%,rgba(26,18,18,0.18))]" />

      <div className="mx-auto flex min-h-[520px] max-w-[1200px] flex-col justify-between px-4 py-8 md:min-h-[560px] md:px-10 md:py-12">
        <div className="max-w-[610px] pt-8 md:pt-12">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-300">
            {latestCollectionTag ? `${latestCollectionTag} drop` : "New season edit"}
          </p>
          <h1 className="font-display text-[44px] leading-[0.96] text-white md:text-[76px]">
            Doll Up Boutique
          </h1>
          <p className="mt-4 max-w-[430px] font-sans text-[15px] leading-[1.6] text-white/84 md:text-[17px]">
            Dresses, lingerie, beachwear and accessories curated in Mauritius for outfits that feel ready now.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop?sort=new"
              className="inline-flex min-h-12 items-center rounded-full bg-coral-500 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(229,96,74,0.24)] transition-colors hover:bg-coral-700"
            >
              Shop new arrivals
            </Link>
            <Link
              href="/shop?on_sale=1"
              className="inline-flex min-h-12 items-center rounded-full border border-white/55 bg-white/10 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur transition-colors hover:bg-white hover:text-ink"
            >
              Browse sale
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-[1.4fr_1fr] md:items-end">
          {hero ? (
            <Link
              href={`/products/${hero.handle}`}
              className="group flex min-h-[86px] max-w-[520px] items-end justify-between gap-4 border-t border-white/30 py-4 transition-colors hover:border-coral-300"
            >
              <div>
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
                  Featured piece
                </p>
                <h2 className="mt-1 line-clamp-2 font-display text-[22px] leading-tight text-white">
                  {hero.title}
                </h2>
              </div>
              {price ? (
                <span className="shrink-0 font-sans text-[13px] font-bold text-white">
                  {formatPrice(price.amount, price.currency)}
                </span>
              ) : null}
            </Link>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {supporting.map((product, index) => (
              <MiniProductLink
                key={product.id}
                product={product}
                blurDataURL={HOME_V2_HERO_BLURS[index] ?? HERO_TILE_1_BLUR}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniProductLink({
  product,
  blurDataURL,
}: {
  product: Product;
  blurDataURL: string;
}) {
  const image = product.thumbnail ?? product.images?.[0]?.url ?? null;
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group relative aspect-[3/4] overflow-hidden rounded-md bg-blush-100"
      aria-label={product.title}
    >
      {image ? (
        <Image
          src={image}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 30vw, 140px"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
          placeholder="blur"
          blurDataURL={blurDataURL}
        />
      ) : null}
    </Link>
  );
}

function TrustStrip() {
  const items = [
    ["Free delivery", "Orders above Rs.1500"],
    ["Cash on delivery", "Available island-wide"],
    ["New drops", "Fresh edits added often"],
    ["Secure checkout", "Juice, transfer, myT"],
  ];

  return (
    <section className="border-b border-blush-300 bg-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-px px-4 py-4 md:grid-cols-4 md:px-10">
        {items.map(([title, body]) => (
          <div key={title} className="min-w-0 px-2 py-2 md:px-5">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
              {title}
            </p>
            <p className="mt-1 break-words font-sans text-[12px] leading-snug text-ink-muted">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopByCategory({
  products,
  saleProducts,
  categoryImages,
}: {
  products: Product[];
  saleProducts: Product[];
  categoryImages: Record<string, string | null>;
}) {
  const fallbackImages = products
    .map((product) => product.thumbnail ?? product.images?.[0]?.url ?? null)
    .filter((src): src is string => Boolean(src));

  return (
    <section className="bg-cream px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
              Start shopping
            </p>
            <h2 className="mt-1 font-display text-[28px] leading-none text-ink md:text-[40px]">
              Choose your mood
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden rounded-full border border-coral-500 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-coral-500 hover:text-white md:inline-flex"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {CATEGORY_LINKS.map((category, index) => {
            const image =
              (category.label === "Sale"
                ? saleProducts[0]?.thumbnail ?? saleProducts[0]?.images?.[0]?.url ?? null
                : null) ??
              (category.handle ? categoryImages[category.handle] : null) ??
              fallbackImages[index % Math.max(fallbackImages.length, 1)] ??
              null;
            return <CategoryTile key={category.label} category={category} image={image} />;
          })}
        </div>
      </div>
    </section>
  );
}

function SaleMoment({ products }: { products: Product[] }) {
  const cfg = salesOfMonthConfig;
  if (!cfg.enabled) return null;

  const lead = products[0];
  const image = lead?.thumbnail ?? lead?.images?.[0]?.url ?? null;

  return (
    <section className="bg-[#2A2220] px-4 py-9 text-white md:px-10 md:py-14">
      <div className="mx-auto grid max-w-[1200px] gap-7 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-coral-300">
            Limited time offer
          </p>
          <h2 className="mt-2 font-display text-[36px] leading-[0.95] md:text-[60px]">
            {cfg.headline}
          </h2>
          <p className="mt-4 max-w-[460px] font-sans text-[15px] leading-[1.7] text-white/78">
            Up to {cfg.percentOff}% off selected winter pieces, with cash on delivery available across Mauritius.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={cfg.ctaUrl}
              className="inline-flex min-h-12 items-center rounded-full bg-coral-500 px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
            >
              {cfg.ctaLabel}
            </Link>
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
              Online prices already applied
            </span>
          </div>
        </div>

        {lead ? (
          <Link
            href={`/products/${lead.handle}`}
            className="group relative aspect-[4/5] overflow-hidden rounded-md bg-white/10 md:aspect-[5/4]"
          >
            {image ? (
              <Image
                src={image}
                alt={lead.title}
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/82 to-transparent p-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-coral-300">
                Sale pick
              </p>
              <h3 className="mt-1 line-clamp-2 font-display text-[24px] leading-tight text-white">
                {lead.title}
              </h3>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function CategoryTile({
  category,
  image,
}: {
  category: (typeof CATEGORY_LINKS)[number];
  image: string | null;
}) {
  return (
    <Link
      href={category.href}
      className="group relative aspect-[4/5] overflow-hidden rounded-md bg-ink text-white shadow-[0_4px_14px_rgba(26,18,18,0.08)] md:aspect-[3/4]"
    >
      {image ? (
        <Image
          src={image}
          alt={category.label}
          fill
          sizes="(max-width: 768px) 50vw, 180px"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/82 via-ink/18 to-transparent" />
      <div className="absolute inset-x-3 bottom-3">
        <p className="font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-coral-300">
          {category.kicker}
        </p>
        <h3 className="mt-1 font-display text-[20px] leading-none text-white">{category.label}</h3>
      </div>
    </Link>
  );
}

function ProductSection({
  eyebrow,
  title,
  href,
  products,
  latestCollectionTag,
  tone,
}: {
  eyebrow: string;
  title: string;
  href: string;
  products: Product[];
  latestCollectionTag: string | null;
  tone: "cream" | "white" | "ink";
}) {
  if (!products.length) return null;

  const isInk = tone === "ink";
  const sectionClass = isInk
    ? "bg-ink text-white"
    : tone === "white"
      ? "bg-white text-ink"
      : "bg-cream text-ink";

  return (
    <section className={`${sectionClass} px-4 py-9 md:px-10 md:py-14`}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p
              className={`font-sans text-[10px] font-bold uppercase tracking-[0.2em] ${
                isInk ? "text-coral-300" : "text-coral-500"
              }`}
            >
              {eyebrow}
            </p>
            <h2 className="mt-1 font-display text-[28px] leading-none md:text-[40px]">{title}</h2>
          </div>
          <Link
            href={href}
            className={`shrink-0 rounded-full px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
              isInk
                ? "border border-white/40 text-white hover:bg-white hover:text-ink"
                : "border border-coral-500 text-coral-500 hover:bg-coral-500 hover:text-white"
            }`}
          >
            Shop all
          </Link>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0">
          {products.slice(0, 8).map((product) => (
            <div key={product.id} className="w-[158px] shrink-0 md:w-auto">
              <ProductCard product={product} latestCollectionTag={latestCollectionTag} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SplitShowcase({
  products,
  fallbackProducts,
  latestCollectionTag,
}: {
  products: Product[];
  fallbackProducts: Product[];
  latestCollectionTag: string | null;
}) {
  const [lead, ...rest] = products.length ? products : fallbackProducts;
  if (!lead) return null;

  const image = lead.thumbnail ?? lead.images?.[0]?.url ?? null;
  const price = getDisplayPrice(lead);
  const supporting = rest.slice(0, 3);

  return (
    <section className="bg-[#F7EFE9] px-4 py-9 text-ink md:px-10 md:py-14">
      <div className="mx-auto grid max-w-[1200px] gap-7 md:grid-cols-[1.05fr_1.2fr] md:items-center">
        <Link
          href={`/products/${lead.handle}`}
          className="group relative aspect-[4/5] overflow-hidden rounded-md bg-blush-100 md:aspect-[5/6]"
        >
          {image ? (
            <Image
              src={image}
              alt={lead.title}
              fill
              sizes="(max-width: 768px) 100vw, 48vw"
              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/76 to-transparent p-5 text-white">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
              Outfit anchor
            </p>
            <h2 className="mt-1 font-display text-[28px] leading-tight">{lead.title}</h2>
            <p className="mt-2 font-sans text-[13px] font-bold">
              {formatPrice(price.amount, price.currency)}
            </p>
          </div>
        </Link>

        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">
            Styled edit
          </p>
          <h2 className="mt-1 font-display text-[32px] leading-none md:text-[48px]">
            Build the full look faster
          </h2>
          <p className="mt-4 max-w-[520px] font-sans text-[14px] leading-[1.7] text-ink-soft md:text-[16px]">
            Lead with one strong piece, then add the easy extras customers already come back for.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {supporting.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                latestCollectionTag={latestCollectionTag}
              />
            ))}
          </div>
          <Link
            href="/shop"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700"
          >
            Shop the edit
          </Link>
        </div>
      </div>
    </section>
  );
}
