"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Cat = { id: string; name: string; handle: string };

export function ShopFilters({
  categories,
  activeHandle,
}: {
  categories: Cat[];
  activeHandle: string | null;
}) {
  return (
    <aside className="w-full md:w-[220px] md:flex-shrink-0">
      <div className="mb-8">
        <div className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
          Categories
        </div>
        <CatLink href="/shop" active={!activeHandle} label="All Products" />
        {categories.map((c) => (
          <CatLink
            key={c.id}
            href={`/shop?category=${c.handle}`}
            active={activeHandle === c.handle}
            label={c.name}
          />
        ))}
      </div>
    </aside>
  );
}

function CatLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-sans text-[13px] ${
        active
          ? "bg-blush-300 font-semibold text-coral-500"
          : "text-ink-soft hover:bg-blush-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sort") ?? "featured";

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(params.toString());
    if (e.target.value === "featured") next.delete("sort");
    else next.set("sort", e.target.value);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={onChange}
      className="cursor-pointer rounded border-[1.5px] border-blush-400 bg-white px-3 py-1.5 font-sans text-[13px] text-ink-soft"
    >
      <option value="featured">Sort: Featured</option>
      <option value="new">Newest First</option>
      <option value="low">Price: Low → High</option>
      <option value="high">Price: High → Low</option>
    </select>
  );
}
