import Link from "next/link";
import Image from "next/image";

type Category = { label: string; href: string; image?: string; special?: boolean };

const CATEGORIES: Category[] = [
  { label: "All New", href: "/shop?sort=new", special: true },
  { label: "Dresses", href: "/shop?category=dresses", image: "/categories/dresses.jpg" },
  { label: "Lingerie", href: "/shop?category=lingerie", image: "/categories/lingerie.jpg" },
  { label: "Beachwear", href: "/shop?category=beachwear", image: "/categories/beachwear.jpg" },
  { label: "Tops", href: "/shop?category=tops", image: "/categories/tops.jpg" },
  { label: "Sale", href: "/shop?sort=sale", image: "/categories/sale.jpg" },
];

export function CategoryIcons() {
  return (
    <section className="bg-white py-5 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3.5 overflow-x-auto px-4 md:hidden">
          {CATEGORIES.map((c) => (
            <Link key={c.label} href={c.href} className="flex w-16 shrink-0 flex-col items-center text-center">
              <CategoryCircle category={c} size={60} />
              <span className="mt-1.5 font-sans text-[10px] font-bold leading-tight text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
        {/* Desktop: 6-up grid */}
        <div className="hidden gap-3 px-10 md:grid md:grid-cols-6">
          {CATEGORIES.map((c) => (
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
  return (
    <div className={cls} style={{ width: size, height: size }}>
      {category.image && (
        <Image src={category.image} alt={category.label} fill sizes={`${size}px`} className="object-cover" />
      )}
    </div>
  );
}
