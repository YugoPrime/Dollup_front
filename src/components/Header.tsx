import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS } from "@/lib/nav";
import { HeaderNavItem } from "@/components/header/HeaderNavItem";
import { HeaderSearchDesktop, HeaderSearchMobile } from "@/components/header/HeaderSearch";
import { HeaderAccountMenu } from "@/components/header/HeaderAccountMenu";
import { HeaderCartButton } from "@/components/header/HeaderCartButton";
import { HeaderMobileMenu } from "@/components/header/HeaderMobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-[100] border-b border-blush-400 bg-white">
      {/* Mobile: single line, no wrap */}
      <div className="flex items-center justify-center bg-coral-500 px-4 py-1.5 text-[11px] font-medium tracking-wider text-white md:hidden">
        <span className="truncate whitespace-nowrap">Free delivery on orders above Rs.1500</span>
      </div>
      {/* Desktop: full multi-message bar */}
      <div className="hidden flex-wrap items-center justify-center gap-3 bg-coral-500 px-6 py-1.5 text-[11px] font-medium tracking-wider text-white md:flex">
        <span>Free delivery on orders Rs.1500+</span>
        <span className="opacity-50">✦</span>
        <span>Cash on delivery available</span>
      </div>

      <div className="flex min-h-[72px] items-center gap-3 px-4 md:min-h-[104px] md:gap-6 md:px-8">
        <Link href="/" aria-label="Doll Up Boutique" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Doll Up Boutique"
            width={260}
            height={224}
            priority
            className="h-[60px] w-auto md:h-[88px]"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <HeaderNavItem key={link.label} link={link} />
          ))}
        </nav>

        <HeaderSearchDesktop />

        {/* Desktop-only icon cluster — wishlist/account/cart live in the mobile bottom bar */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/wishlist"
            prefetch={false}
            className="rounded-md p-2 hover:bg-blush-100"
            aria-label="Wishlist"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>
          <HeaderAccountMenu />
          <HeaderCartButton />
        </div>

        {/* Mobile-only hamburger pinned right */}
        <HeaderMobileMenu />
      </div>

      <HeaderSearchMobile />
    </header>
  );
}
