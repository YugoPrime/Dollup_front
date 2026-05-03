"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const Icon = {
  Home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Shop: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Bag: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  User: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount, setOpen } = useCart();

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Icon.Home },
    { href: "/shop", label: "Shop", icon: Icon.Shop },
    { href: "/wishlist", label: "Wishlist", icon: Icon.Heart },
    { href: "#cart", label: "Cart", icon: Icon.Bag },
    { href: "/account", label: "Me", icon: Icon.User },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Mobile primary"
      className="sticky bottom-0 z-[100] flex border-t border-blush-400 bg-white/95 backdrop-blur md:hidden"
    >
      {items.map((item) => {
        const active = isActive(item.href);
        const className = `flex flex-1 flex-col items-center gap-0.5 py-2 font-sans text-[9px] font-semibold uppercase tracking-wider ${
          active ? "text-coral-500" : "text-ink-muted"
        }`;

        if (item.href === "#cart") {
          return (
            <button key={item.label} onClick={() => setOpen(true)} className={className}>
              <span className="relative">
                {item.icon}
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </span>
              {item.label}
            </button>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
