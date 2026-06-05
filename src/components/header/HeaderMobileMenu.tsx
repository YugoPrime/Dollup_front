"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { NavLink } from "@/lib/nav";

const FocusTrapLayer = dynamic(
  () => import("@/components/a11y/FocusTrapLayer").then((m) => m.FocusTrapLayer),
  { ssr: false, loading: () => null },
);

/* ---------- inline icon set (no extra requests) ---------- */

type IconProps = { className?: string };

const Icon = {
  Star: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />
    </svg>
  ),
  Dress: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6l-1.2 3 2.7 4-2 1.5L17 20H7l2.5-8.5L7.5 10l2.7-4z" />
      <path d="M10 3c.8 1.5 3.2 1.5 4 0" />
    </svg>
  ),
  TwoPiece: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 5h4l-.5 3h7L15 5h4l-1.5 5h-11z" />
      <path d="M8 13h8l-1 7H9z" />
    </svg>
  ),
  Jumpsuit: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 3h6l1 4-1 4 1 9h-3l-1-6-1 6H8l1-9-1-4z" />
    </svg>
  ),
  Top: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7l5-3 3 2 3-2 5 3-2 3-2-1v9H8v-9l-2 1z" />
    </svg>
  ),
  Bottom: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 5h12l-1 7-1 8h-3l-1-8-1 8H8l-1-8z" />
    </svg>
  ),
  Snow: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 2v20M4 6l16 12M4 18L20 6M2 12h20" />
    </svg>
  ),
  Lingerie: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" className={className} aria-hidden>
      <path d="M3 8c2 0 3 1.5 3 3s-1 3.5-3 3.5" />
      <path d="M21 8c-2 0-3 1.5-3 3s1 3.5 3 3.5" />
      <path d="M6 8h12" />
      <path d="M9 11c1 1 2 1 3 1s2 0 3-1" />
    </svg>
  ),
  Heart: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </svg>
  ),
  Palm: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 21V9" />
      <path d="M12 9c-2-3-6-3-8-1 2 .5 4 2 5 4" />
      <path d="M12 9c2-3 6-3 8-1-2 .5-4 2-5 4" />
      <path d="M12 9c-1-3 1-6 4-6-.5 2-1 4-3 5" />
    </svg>
  ),
  Bag: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  ),
  Tag: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 13l8-8h8v8l-8 8z" />
      <circle cx="14.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  Gift: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 10h18v3H3z" />
      <path d="M5 13h14v8H5z" />
      <path d="M12 10v11" />
      <path d="M12 10c-2-3-6-1-3 1 1 .6 3 0 3-1zM12 10c2-3 6-1 3 1-1 .6-3 0-3-1z" />
    </svg>
  ),
  Chevron: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  Search: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  Close: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Menu: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
};

const TOP_LEVEL_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  "New Arrivals": Icon.Star,
  Outfit: Icon.Dress,
  Lingerie: Icon.Lingerie,
  "After Dark": Icon.Heart,
  Beachwear: Icon.Palm,
  Accessories: Icon.Bag,
  Sale: Icon.Tag,
};

const CHILD_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  Dresses: Icon.Dress,
  "Two-Pieces Set": Icon.TwoPiece,
  Jumpsuits: Icon.Jumpsuit,
  Top: Icon.Top,
  Bottom: Icon.Bottom,
  Winter: Icon.Snow,
};

function HotBadge() {
  return (
    <span
      aria-label="Hot"
      className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-coral-500 to-coral-700 px-1.5 py-[2px] font-sans text-[9px] font-bold uppercase leading-none tracking-wider text-white shadow-[0_1px_2px_rgba(229,96,74,0.35)]"
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.5 1.5c.3 3.5-1.3 5.6-3 7.5-1.8 2-3.5 4-3.5 7a8 8 0 0 0 16 0c0-4-2.4-7.3-5.1-9.7.4 2.4-.5 3.9-1.8 4.5-.2-3-1-6.5-2.6-9.3zm-.8 12.4c.6 1.4 2.2 1.8 2.7 3.4.4 1.4-.6 2.7-2 2.7-1.7 0-3-1.4-2.5-3 .3-1 1.2-1.7 1.8-3.1z" />
      </svg>
      Hot
    </span>
  );
}

function Leaf({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden
    >
      <g stroke="#e5c4b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        <path d="M10 10c20 5 35 20 45 45" fill="#f2d6cc" fillOpacity="0.45" />
        <path d="M22 6c12 6 22 16 32 32" />
        <path d="M6 22c6 12 16 22 32 32" />
        <path d="M30 4c4 4 7 8 9 13M4 30c4 2 8 5 13 9" />
      </g>
    </svg>
  );
}

export function HeaderMobileMenu({ navLinks }: { navLinks: NavLink[] }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("Outfit");
  const [query, setQuery] = useState("");

  // Lock page scroll when drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    close();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-blush-100 md:hidden"
        aria-label="Open menu"
        aria-controls="mobile-menu"
        aria-expanded={menuOpen}
      >
        <Icon.Menu className="h-[22px] w-[22px]" />
      </button>

      {menuOpen ? (
        <FocusTrapLayer
          ariaLabel="Mobile menu"
          className="fixed inset-0 z-[120] bg-cream md:hidden"
          onDeactivate={close}
        >
          <div
            id="mobile-menu"
            className="relative flex h-full flex-col overflow-hidden"
          >
            {/* Decorative leaves — non-interactive */}
            <Leaf className="pointer-events-none absolute -left-3 -top-2 h-24 w-24 opacity-80" />
            <Leaf className="pointer-events-none absolute -right-4 bottom-14 h-28 w-28 -scale-x-100 rotate-180 opacity-60" />

            {/* Header: centered logo + close button */}
            <div
              className="relative flex items-center justify-center px-4 pb-3"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
            >
              <Link
                href="/"
                onClick={close}
                aria-label="Doll Up Boutique"
                className="relative z-10"
              >
                <Image
                  src="/logo.png"
                  alt="Doll Up Boutique"
                  width={260}
                  height={224}
                  priority
                  sizes="84px"
                  className="h-[72px] w-auto"
                />
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="absolute right-3 top-[calc(env(safe-area-inset-top)+14px)] grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-95"
              >
                <Icon.Close className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar */}
            <form onSubmit={onSearch} className="relative z-10 px-4">
              <div className="flex items-center gap-2 rounded-full border border-blush-300 bg-white/90 px-4 py-2.5 backdrop-blur focus-within:border-coral-500 focus-within:ring-2 focus-within:ring-coral-500/20">
                <Icon.Search className="h-4 w-4 shrink-0 text-ink-muted" />
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="flex-1 bg-transparent font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
            </form>

            {/* Nav list — scrollable middle region */}
            <nav className="relative z-10 mt-4 flex-1 overflow-y-auto px-3 pb-28">
              <ul className="space-y-0">
                {navLinks.map((link, i) => {
                  const TopIcon = TOP_LEVEL_ICONS[link.label] ?? Icon.Star;
                  const hasChildren = !!link.children && link.children.length > 0;
                  const isOpen = expanded === link.label;
                  const showDivider = i < navLinks.length - 1;
                  return (
                    <li key={link.label} className={showDivider ? "border-b border-blush-200/70" : ""}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : link.label)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center gap-3 px-3 py-3.5 text-left font-sans text-[15px] font-medium text-ink active:bg-blush-100/60"
                        >
                          <TopIcon className="h-6 w-6 shrink-0 text-ink-soft" />
                          <span className="flex-1">{link.label}</span>
                          {link.badge === "hot" ? <HotBadge /> : null}
                          <Icon.Chevron
                            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                          />
                        </button>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={close}
                          className="flex w-full items-center gap-3 px-3 py-3.5 font-sans text-[15px] font-medium text-ink active:bg-blush-100/60"
                        >
                          <TopIcon className="h-6 w-6 shrink-0 text-ink-soft" />
                          <span className="flex-1">{link.label}</span>
                          {link.badge === "hot" ? <HotBadge /> : null}
                          <Icon.Chevron className="h-4 w-4 shrink-0 text-ink-muted" />
                        </Link>
                      )}

                      {hasChildren ? (
                        <div
                          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                        >
                          <div className="min-h-0">
                            <ul className="mb-3 ml-9 mr-1 rounded-2xl border border-blush-200/80 bg-white/70 px-2 py-1">
                              {link.children!.map((c, ci) => {
                                const ChildIcon = CHILD_ICONS[c.label] ?? Icon.Tag;
                                return (
                                  <li
                                    key={c.label}
                                    className={ci < link.children!.length - 1 ? "border-b border-blush-100" : ""}
                                  >
                                    <Link
                                      href={c.href}
                                      onClick={close}
                                      className="flex items-center gap-3 px-3 py-2.5 font-sans text-[13.5px] text-ink-soft active:bg-blush-100/60"
                                    >
                                      <ChildIcon className="h-5 w-5 shrink-0 text-ink-muted" />
                                      <span className="flex-1">{c.label}</span>
                                      <Icon.Chevron className="h-3.5 w-3.5 shrink-0 text-ink-muted/70" />
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Free shipping CTA pinned bottom */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
            >
              <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-gradient-to-r from-coral-500 to-coral-700 px-4 py-3 text-white shadow-[0_8px_24px_rgba(229,96,74,0.35)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                  <Icon.Gift className="h-5 w-5 text-white" />
                </span>
                <div className="flex-1 leading-tight">
                  <p className="font-sans text-[14px] font-semibold">Free Shipping</p>
                  <p className="font-sans text-[11px] text-white/85">on orders Rs.1500+</p>
                </div>
              </div>
            </div>
          </div>
        </FocusTrapLayer>
      ) : null}
    </>
  );
}
