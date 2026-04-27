"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { NAV_LINKS } from "@/lib/nav";

export function Header() {
  const router = useRouter();
  const { itemCount, setOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-blush-400 bg-white">
      <div className="flex flex-wrap items-center justify-center gap-3 bg-coral-500 px-6 py-1.5 text-[11px] font-medium tracking-wider text-white">
        <span>Free shipping on orders Rs.999+</span>
        <span className="opacity-50">✦</span>
        <span>New arrivals every Friday</span>
        <span className="opacity-50">✦</span>
        <span>Easy 7-day returns</span>
      </div>

      <div className="flex h-[72px] items-center justify-between px-6 md:px-8">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 md:hidden"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/" aria-label="Doll Up Boutique" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Doll Up Boutique"
            width={156}
            height={52}
            priority
            className="h-[52px] w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-sans text-[13px] font-medium tracking-wide text-ink transition-colors hover:text-coral-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="rounded-md p-2 hover:bg-blush-100"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <Link
            href="/wishlist"
            className="rounded-md p-2 hover:bg-blush-100"
            aria-label="Wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>
          <Link
            href="/account"
            className="rounded-md p-2 hover:bg-blush-100"
            aria-label="Account"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative rounded-md p-2 hover:bg-blush-100"
            aria-label="Cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute right-[6px] top-[6px] flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form
          onSubmit={onSearch}
          className="flex items-center gap-2.5 border-t border-blush-300 bg-cream px-6 py-3 md:px-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B89390" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
            placeholder="Search for dresses, lingerie, accessories…"
            className="flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="shrink-0 p-1 text-coral-300 hover:text-coral-500"
            aria-label="Close search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </form>
      )}

      {menuOpen && (
        <nav className="flex flex-col border-t border-blush-400 bg-white md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-blush-100 px-6 py-3.5 font-sans text-sm font-medium text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
