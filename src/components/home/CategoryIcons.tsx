import Link from "next/link";
import Image from "next/image";

type Category = {
  label: string;
  href: string;
  image: string;
};

const CATEGORIES: Category[] = [
  { label: "All New", href: "/shop?sort=new", image: "/categories/all.webp" },
  { label: "Dresses", href: "/shop?category=dresses", image: "/categories/dress.webp" },
  { label: "Lingerie", href: "/shop?category=lingerie", image: "/categories/lingerie.webp" },
  { label: "Beachwear", href: "/shop?category=beachwear", image: "/categories/bikini.webp" },
  { label: "Accessories", href: "/shop?category=accessories", image: "/categories/accessoires.webp" },
  { label: "Sale", href: "/shop?on_sale=1", image: "/categories/sales.webp" },
];

export function CategoryIcons() {
  return (
    <section className="bg-white py-5 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-3 md:hidden">
          {CATEGORIES.map((c) => (
            <Link key={c.label} href={c.href} className="flex w-[54px] shrink-0 flex-col items-center text-center">
              <CategoryCircle category={c} size={54} />
              <span className="mt-1.5 line-clamp-1 font-sans text-[10px] font-bold leading-tight text-ink">{c.label}</span>
            </Link>
          ))}
        </div>
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
  return (
    <div className="relative overflow-hidden rounded-full" style={{ width: size, height: size }}>
      <Image
        src={category.image}
        alt={category.label}
        fill
        sizes="(min-width: 768px) 88px, 54px"
        className="object-cover"
      />
    </div>
  );
}
