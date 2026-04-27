import Link from "next/link";

const CATEGORIES = [
  { label: "Dresses", desc: "Effortless everyday looks", bg: "#FAE8E4", slug: "dresses" },
  { label: "Lingerie", desc: "Sensual & comfortable", bg: "#F2DDD8", slug: "lingerie" },
  { label: "Beachwear", desc: "Sun-ready styles", bg: "#F5EDEB", slug: "beachwear" },
  { label: "Accessories", desc: "Finishing touches", bg: "#EAD9D6", slug: "accessories" },
];

export function CategoryStrip() {
  return (
    <div className="grid grid-cols-2 border-y border-blush-400 md:grid-cols-4">
      {CATEGORIES.map((c) => (
        <Link
          key={c.label}
          href={`/shop?category=${c.slug}`}
          className="flex flex-col items-center px-6 py-9 text-center transition-[filter] duration-200 hover:brightness-[0.96]"
          style={{ background: c.bg }}
        >
          <div className="mb-2.5 font-display text-2xl italic text-coral-500/40">
            {c.label[0]}
          </div>
          <div className="mb-1.5 font-display text-[17px] font-semibold text-ink">
            {c.label}
          </div>
          <div className="mb-3.5 font-sans text-xs text-ink-soft">{c.desc}</div>
          <span className="font-sans text-xs font-semibold text-coral-500">
            Shop →
          </span>
        </Link>
      ))}
    </div>
  );
}
