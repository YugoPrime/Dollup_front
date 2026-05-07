"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const Icon = {
  Home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Shop: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Heart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Bag: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  User: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount, setOpen } = useCart();

  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) {
    return null;
  }

  // Cart sits in the middle (3rd of 5) and is rendered as a raised pill.
  const sideItems: { left: NavItem[]; right: NavItem[] } = {
    left: [
      { href: "/", label: "Home", icon: Icon.Home },
      { href: "/shop", label: "Shop", icon: Icon.Shop },
    ],
    right: [
      { href: "/wishlist", label: "Wishlist", icon: Icon.Heart },
      { href: "/account", label: "Me", icon: Icon.User },
    ],
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderSide = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex flex-1 flex-col items-center gap-1 py-2.5 font-sans text-[10px] font-semibold tracking-wide transition-colors ${
          active ? "text-coral-500" : "text-ink-muted hover:text-ink"
        }`}
      >
        <span
          className={`flex h-7 items-center justify-center transition-transform ${
            active ? "scale-110" : "group-active:scale-95"
          }`}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
        <span
          className={`h-0.5 w-6 rounded-full bg-coral-500 transition-opacity ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
      </Link>
    );
  };

  return (
    <nav
      aria-label="Mobile primary"
      className="sticky bottom-0 z-[100] flex items-end border-t border-blush-400 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(229,96,74,0.06)] backdrop-blur md:hidden"
    >
      {sideItems.left.map(renderSide)}

      {/* Center: prominent cart */}
      <div className="relative flex flex-1 items-end justify-center">
        <button
          onClick={() => setOpen(true)}
          aria-label="Cart"
          className="-translate-y-3 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-white shadow-[0_6px_18px_rgba(229,96,74,0.45)] ring-4 ring-white transition active:scale-95"
        >
          <span className="relative flex items-center justify-center">
            {Icon.Bag}
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {itemCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {sideItems.right.map(renderSide)}
    </nav>
  );
}
