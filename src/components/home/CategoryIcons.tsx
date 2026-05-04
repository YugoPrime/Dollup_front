import Link from "next/link";
import Image from "next/image";
import { getCategoryIconImages, listProducts, getLatestCollectionTag } from "@/lib/products";

type Category = {
  label: string;
  href: string;
  // Either a category handle (we'll fetch a product thumbnail from it) OR a
  // direct image override (for "All New" / "Sale" which aren't a single category).
  categoryHandle?: string;
  imageOverride?: string | null;
  special?: boolean;
  gradient?: string;
};

const CATEGORIES: Category[] = [
  { label: "All New", href: "/shop?sort=new", special: true, gradient: "linear-gradient(135deg,#FCE9E4,#E5604A)" },
  { label: "Dresses", href: "/shop?category=dresses", categoryHandle: "dresses", gradient: "linear-gradient(135deg,#FAE8E4,#F8B0A0)" },
  { label: "Lingerie", href: "/shop?category=lingerie", categoryHandle: "lingerie", gradient: "linear-gradient(135deg,#F8D5CD,#E5604A)" },
  { label: "Beachwear", href: "/shop?category=beachwear", categoryHandle: "beachwear", gradient: "linear-gradient(135deg,#FFF5E1,#F4D03F)" },
  { label: "Accessories", href: "/shop?category=accessories", categoryHandle: "accessories", gradient: "linear-gradient(135deg,#F5EDEB,#B89390)" },
  { label: "Sale", href: "/shop?on_sale=1", gradient: "linear-gradient(135deg,#E5604A,#B8412C)" },
];

export async function CategoryIcons() {
  // Fetch real product thumbnails for the category icons. Cheap (6 parallel
  // 1-product queries). For "All New" we use the newest collectionN product;
  // for "Sale" we use the newest on-sale product. The page sets revalidate=60.
  const handles = CATEGORIES.map((c) => c.categoryHandle).filter((h): h is string => !!h);
  const [thumbsByHandle, latestCollection, saleSample] = await Promise.all([
    getCategoryIconImages(handles).catch(() => ({} as Record<string, string | null>)),
    getLatestCollectionTag().catch(() => null),
    listProducts({ onSale: true, limit: 1, order: "-created_at" }).catch(() => ({ products: [] })),
  ]);

  let allNewThumb: string | null = null;
  if (latestCollection) {
    try {
      const res = await listProducts({ tag: latestCollection.id, limit: 1, order: "-created_at" });
      allNewThumb = res.products[0]?.thumbnail ?? null;
    } catch {
      /* fallback to gradient */
    }
  }
  const saleThumb = saleSample.products[0]?.thumbnail ?? null;

  const items = CATEGORIES.map((c) => {
    let image: string | null = c.imageOverride ?? null;
    if (!image && c.categoryHandle) image = thumbsByHandle[c.categoryHandle] ?? null;
    if (!image && c.label === "All New") image = allNewThumb;
    if (!image && c.label === "Sale") image = saleThumb;
    return { ...c, image };
  });

  return (
    <section className="bg-white py-5 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3.5 overflow-x-auto px-4 md:hidden">
          {items.map((c) => (
            <Link key={c.label} href={c.href} className="flex w-16 shrink-0 flex-col items-center text-center">
              <CategoryCircle category={c} size={60} />
              <span className="mt-1.5 font-sans text-[10px] font-bold leading-tight text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
        {/* Desktop: 6-up grid */}
        <div className="hidden gap-3 px-10 md:grid md:grid-cols-6">
          {items.map((c) => (
            <Link key={c.label} href={c.href} className="flex flex-col items-center text-center">
              <CategoryCircle category={c} size={88} />
              <span className="mt-2 font-sans text-[12px] font-semibold text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCircle({
  category,
  size,
}: {
  category: Category & { image: string | null };
  size: number;
}) {
  const cls = "relative overflow-hidden rounded-full border-2 border-blush-300";
  if (category.image) {
    return (
      <div className={cls} style={{ width: size, height: size }}>
        <Image src={category.image} alt={category.label} fill sizes={`${size}px`} className="object-cover object-top" />
      </div>
    );
  }
  if (category.special) {
    return (
      <div
        className={`${cls} flex items-center justify-center border-coral-500`}
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg,#FCE9E4,#E5604A)",
        }}
      >
        <span className="font-display text-[26px] font-bold text-white">★</span>
      </div>
    );
  }
  // Gradient + first-letter fallback when no image is available.
  const letter = category.label.charAt(0).toUpperCase();
  return (
    <div
      className={`${cls} flex items-center justify-center`}
      style={{
        width: size,
        height: size,
        background: category.gradient ?? "linear-gradient(135deg,#F5EDEB,#B89390)",
      }}
    >
      <span className="font-display font-bold text-white" style={{ fontSize: Math.round(size * 0.42) }}>
        {letter}
      </span>
    </div>
  );
}
