import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import Image from "next/image";

type Category = {
  label: string;
  href: string;
  image?: string;
  special?: boolean;
  // CSS gradient used when no image is set yet — keeps the circle looking
  // intentional rather than empty until a real photo is dropped in.
  gradient?: string;
};

// Server-side existence check so we silently fall back to the gradient until
// the user drops the real image into /public/categories/<slug>.png.
function imageExists(publicPath: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\/+/, "")));
  } catch {
    return false;
  }
}

// Drop final 400×400 PNG/JPG for each into /public/categories/<slug>.png
// (e.g. /public/categories/dresses.png) and the circle picks it up. Until then,
// the gradient + first-letter fallback keeps the section looking intentional.
const CATEGORIES: Category[] = [
  { label: "All New", href: "/shop?sort=new", special: true, image: "/categories/all-new.png" },
  { label: "Dresses", href: "/shop?category=dresses", image: "/categories/dresses.png", gradient: "linear-gradient(135deg,#FAE8E4,#F8B0A0)" },
  { label: "Lingerie", href: "/shop?category=lingerie", image: "/categories/lingerie.png", gradient: "linear-gradient(135deg,#F8D5CD,#E5604A)" },
  { label: "Beachwear", href: "/shop?category=beachwear", image: "/categories/beachwear.png", gradient: "linear-gradient(135deg,#FFF5E1,#F4D03F)" },
  { label: "Accessories", href: "/shop?category=accessories", image: "/categories/accessories.png", gradient: "linear-gradient(135deg,#F5EDEB,#B89390)" },
  { label: "Sale", href: "/shop?on_sale=1", image: "/categories/sale.png", gradient: "linear-gradient(135deg,#E5604A,#B8412C)" },
];

export function CategoryIcons() {
  const items = CATEGORIES.map((c) => ({
    ...c,
    image: c.image && imageExists(c.image) ? c.image : undefined,
  }));
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

function CategoryCircle({ category, size }: { category: Category; size: number }) {
  const cls = "relative overflow-hidden rounded-full border-2 border-blush-300";
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
  if (category.image) {
    return (
      <div className={cls} style={{ width: size, height: size }}>
        <Image src={category.image} alt={category.label} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }
  // Gradient fallback with first-letter — used until a real photo is dropped in.
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
      <span
        className="font-display font-bold text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </span>
    </div>
  );
}
