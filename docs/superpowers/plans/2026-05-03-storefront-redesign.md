# Storefront Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/`, `/shop`, and `/products/[handle]` to layer Shein-grade UX patterns onto the existing Doll Up boutique brand, and fix the long-standing 3:4 image-sizing issue across every product image.

**Architecture:** Four independently shippable phases.
- Phase 1 lays foundation (new `ProductCard`, image-aspect fix, mobile bottom nav, persistent search) so all current pages keep working.
- Phase 2 rebuilds the home page (hero bento + reordered/new sections).
- Phase 3 rebuilds `/shop` (filter chips, sticky bar, sidebar, sort).
- Phase 4 rebuilds the PDP (peek-carousel mobile, 90px-thumbs desktop, sticky ATC, accordion, reviews).

After each phase, the site builds, type-checks, and runs end-to-end. After Phase 1 the old pages still work but already feel fresher. Each subsequent phase replaces a page wholesale.

**Tech Stack:** Next.js 16 App Router (RSC + Turbopack), React 19, Tailwind v4 with `@theme` tokens, `@medusajs/js-sdk@2.14.1`, TypeScript 5. **No test runner exists** in this repo — per `CLAUDE.md`, verification is `npx tsc --noEmit` + `npm run lint` + `npm run build` + manual browser smoke. Every task in this plan ends with that triplet, not an automated test run.

**Spec:** `docs/superpowers/specs/2026-05-03-storefront-redesign-design.md`

**Reference mockups (read-only):** `.superpowers/brainstorm/<session>/content/*.html` — these are the brainstorm browser HTMLs the user already approved. Use them when in doubt about layout / spacing / hover behavior.

---

## Project conventions to keep in mind

- Tailwind v4 custom tokens in use: `coral-{300,500,700}`, `blush-{100,300,400}`, `cream`, `ink`, `ink-soft`, `ink-muted`. Fonts: `font-display` (Playfair), `font-sans` (DM Sans). **Don't introduce new palette colors.**
- Server components by default. Add `"use client"` only when needed (state, refs, browser APIs, animations driven by intersection observer, etc.).
- Type imports come from `@medusajs/types` as `HttpTypes.Store…`. If the documented name doesn't exist, look in `node_modules/@medusajs/types/dist/http/` for the real one.
- Read `node_modules/next/dist/docs/01-app/...` before assuming a Next.js 16 API — there are breaking changes from training data.
- `next/image` `sizes` attribute matters — set it on every `<Image fill>`.
- Keep components small and focused. If a file passes ~250 lines, consider splitting.

## File map (whole plan)

```
src/app/
  layout.tsx                              # MODIFY (Phase 1 Task 1.5): add MobileBottomNav
  page.tsx                                # REWRITE (Phase 2 Task 2.10): new section order
  shop/page.tsx                           # REWRITE (Phase 3 Task 3.6): new layout
  products/[handle]/page.tsx              # REWRITE (Phase 4 Task 4.9): new PDP layout

src/components/
  Header.tsx                              # MODIFY (Phase 1 Task 1.4): persistent search
  MobileBottomNav.tsx                     # NEW (Phase 1 Task 1.3)
  ProductCard.tsx                         # REWRITE (Phase 1 Task 1.1): Card B
  home/
    HeroBento.tsx                         # NEW (Phase 2 Task 2.1)
    HeroA.tsx                             # DELETE (Phase 2 Task 2.10)
    TrendingRail.tsx                      # NEW (Phase 2 Task 2.2)
    CategoryIcons.tsx                     # NEW (Phase 2 Task 2.3) — replaces CategoryStrip
    CategoryStrip.tsx                     # DELETE (Phase 2 Task 2.10)
    SalesOfTheMonth.tsx                   # NEW (Phase 2 Task 2.4)
    EditorialBanner.tsx                   # DELETE (Phase 2 Task 2.10)
    NewArrivalsRail.tsx                   # NEW (Phase 2 Task 2.5)
    NewArrivals.tsx                       # DELETE (Phase 2 Task 2.10)
    LoyaltyTeaser.tsx                     # REWRITE (Phase 2 Task 2.6)
    Testimonials.tsx                      # REWRITE (Phase 2 Task 2.7)
    BabeEssentials.tsx                    # NEW (Phase 2 Task 2.8)
  shop/
    ShopFilterChips.tsx                   # NEW (Phase 3 Task 3.1)
    ShopFilterSheet.tsx                   # NEW (Phase 3 Task 3.2)
    ShopFilterSidebar.tsx                 # NEW (Phase 3 Task 3.3) — was ShopFilters
    ShopStickyBar.tsx                     # NEW (Phase 3 Task 3.4)
    ShopSortDropdown.tsx                  # NEW (Phase 3 Task 3.5)
    ShopFilters.tsx                       # DELETE (Phase 3 Task 3.6)
  product/
    ProductGalleryMobile.tsx              # NEW (Phase 4 Task 4.1)
    ProductGalleryDesktop.tsx             # NEW (Phase 4 Task 4.2)
    ProductGallery.tsx                    # REWRITE (Phase 4 Task 4.3): media-query router
    ProductBuy.tsx                        # REWRITE (Phase 4 Task 4.4)
    StickyATC.tsx                         # NEW (Phase 4 Task 4.5)
    ProductAccordion.tsx                  # NEW (Phase 4 Task 4.6) — replaces ProductTabs
    ProductTabs.tsx                       # DELETE (Phase 4 Task 4.6)
    ProductReviews.tsx                    # NEW (Phase 4 Task 4.7)
    YouMayAlsoLike.tsx                    # NEW (Phase 4 Task 4.8)

src/lib/
  format.ts                               # MODIFY (Phase 1 Task 1.1): add formatDiscountPercent
  products.ts                             # MODIFY (Phase 2 Task 2.1): add listFeatured, listEssentials helpers
  hooks/useMediaQuery.ts                  # NEW (Phase 1 Task 1.2)
  sales-of-month.ts                       # NEW (Phase 2 Task 2.4)
  reviews.ts                              # NEW (Phase 4 Task 4.7) — hardcoded review data
```

---

# Phase 1 — Foundation

After this phase, all 6 existing pages render unchanged, but they use the new `ProductCard`, every product image is 3:4 portrait, the mobile bottom nav is visible, and the search is always-on in the header.

## Task 1.1: Rewrite `ProductCard` to Card B

**Files:**
- Modify: `src/lib/format.ts`
- Rewrite: `src/components/ProductCard.tsx`

- [ ] **Step 1: Add discount-percent helper to `format.ts`**

Append to `src/lib/format.ts`:

```ts
export function formatDiscountPercent(
  amount: number | null | undefined,
  original: number | null | undefined,
): string | null {
  if (amount == null || original == null || original <= amount) return null;
  const pct = Math.round(((original - amount) / original) * 100);
  return `-${pct}%`;
}
```

- [ ] **Step 2: Rewrite `ProductCard.tsx` to Card B**

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

const NEW_DAYS = 30;
const LOW_STOCK_THRESHOLD = 5;
const MAX_COLOR_DOTS = 4;

function isNew(product: Product) {
  if (!product.created_at) return false;
  const days = (Date.now() - new Date(product.created_at).getTime()) / 86_400_000;
  return days <= NEW_DAYS;
}

function getLowStockMessage(product: Product): string | null {
  // Worst case: any variant with manage_inventory and 0 < qty < threshold
  const lowVariants = (product.variants ?? []).filter(
    (v) =>
      v.manage_inventory &&
      v.inventory_quantity != null &&
      v.inventory_quantity > 0 &&
      v.inventory_quantity < LOW_STOCK_THRESHOLD,
  );
  if (!lowVariants.length) return null;
  const minQty = Math.min(...lowVariants.map((v) => v.inventory_quantity ?? 0));
  return `${minQty} left`;
}

function getColorOptions(product: Product) {
  const colorOption = product.options?.find(
    (o) => (o.title ?? "").toLowerCase() === "color",
  );
  if (!colorOption) return [];
  return (colorOption.values ?? []).map((v) => v.value).filter(Boolean) as string[];
}

// Best-effort hex mapping for common color names. Unknown values fall back to neutral grey.
function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    black: "#1c1010",
    white: "#ffffff",
    coral: "#E5604A",
    blush: "#F2DDD8",
    cream: "#FAF6F4",
    nude: "#F2DDD8",
    pink: "#F8D5CD",
    red: "#B8412C",
    green: "#3a5a40",
    blue: "#85C1E9",
    yellow: "#F4D03F",
    grey: "#8a7773",
    gray: "#8a7773",
    brown: "#5e4030",
  };
  return map[name.toLowerCase()] ?? "#8a7773";
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState(false);

  const price = getDisplayPrice(product);
  const inStock = product.variants?.some(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
  );
  const soldOut = product.variants?.length ? !inStock : false;
  const lowStockMsg = getLowStockMessage(product);
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const thumb = product.thumbnail ?? product.images?.[0]?.url ?? null;
  const colors = getColorOptions(product);
  const isMultiVariant = (product.variants?.length ?? 0) > 1;

  const onQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMultiVariant) return; // Link-mode handles navigation
    const variant = product.variants?.find(
      (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
    );
    if (!variant) return;
    setBusy(true);
    try {
      await addItem(variant.id, 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group relative block overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(229,96,74,0.06)] transition-all duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.16)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-blush-100">
        {soldOut && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Sold Out
            </span>
          </div>
        )}

        {/* Badge stack — top-left */}
        <div className="absolute left-2 top-2 z-[3] flex flex-col gap-1.5">
          {isNew(product) && (
            <span className="rounded bg-coral-500 px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-white">
              New
            </span>
          )}
          {discountPct && (
            <span className="rounded bg-coral-500 px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-white">
              {discountPct}
            </span>
          )}
          {lowStockMsg && !discountPct && (
            <span className="rounded border border-coral-500 bg-white px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-wider text-coral-500">
              {lowStockMsg}
            </span>
          )}
        </div>

        {/* Heart — top-right */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 z-[4] flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {thumb && (
          <Image
            src={thumb}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover object-top"
          />
        )}

        {/* Persistent Quick Add — bottom of image */}
        {!soldOut && (
          <div className="absolute inset-x-2 bottom-2 z-[5]">
            <button
              onClick={onQuickAdd}
              disabled={busy || loading}
              className="w-full rounded-md bg-white py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm hover:bg-blush-100 disabled:opacity-60"
            >
              {busy ? "Adding…" : isMultiVariant ? "Select size" : "+ Quick Add"}
            </button>
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <div className="line-clamp-2 min-h-[34px] font-sans text-[12px] leading-[1.3] text-ink">
          {product.title}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span
            className={`font-sans text-[13px] font-bold ${
              soldOut ? "text-coral-300" : price.onSale ? "text-coral-500" : "text-ink"
            }`}
          >
            {formatPrice(price.amount, price.currency)}
          </span>
          {price.onSale && (
            <span className="font-sans text-[11px] text-ink-muted line-through">
              {formatPrice(price.original, price.currency)}
            </span>
          )}
        </div>
        {colors.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {colors.slice(0, MAX_COLOR_DOTS).map((c) => (
              <span
                key={c}
                title={c}
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ background: colorNameToHex(c) }}
              />
            ))}
            {colors.length > MAX_COLOR_DOTS && (
              <span className="flex h-3 min-w-[18px] items-center justify-center rounded-full border border-ink-muted bg-white px-1 font-sans text-[7px] font-bold text-ink-muted">
                +{colors.length - MAX_COLOR_DOTS}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Verify type-check + lint + build**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three pass with no new errors.

- [ ] **Step 4: Manual smoke**

Run `npm run dev`. Visit `/`, `/shop`, and `/products/<some-handle>`. Confirm:
- Cards on home and shop are 3:4 portrait, no peach card-fills behind images
- New / discount / low-stock badges show top-left when applicable
- Heart icon top-right, Quick Add pill at bottom (says "Select size" on multi-variant products)
- Color dots render below price for products with a `color` option

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/components/ProductCard.tsx
git commit -m "feat(card): rewrite ProductCard as Card B with 3:4 aspect"
```

---

## Task 1.2: `useMediaQuery` hook

**Files:**
- Create: `src/lib/hooks/useMediaQuery.ts`

- [ ] **Step 1: Create the hook**

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook. Returns false on the server and during the first
 * client render, then updates to the real value once the listener attaches.
 * Use a stable, narrow query string — don't construct one inline.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const DESKTOP_QUERY = "(min-width: 768px)";
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useMediaQuery.ts
git commit -m "feat(hooks): add SSR-safe useMediaQuery"
```

---

## Task 1.3: `MobileBottomNav` component

**Files:**
- Create: `src/components/MobileBottomNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileBottomNav.tsx
git commit -m "feat(nav): add MobileBottomNav with Home/Shop/Wishlist/Cart/Me"
```

---

## Task 1.4: Header — persistent search

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Update the Header so the search bar is always visible**

Replace the contents of `src/components/Header.tsx` (full file) with:

```tsx
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
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

      <div className="flex h-[64px] items-center gap-3 px-4 md:gap-6 md:px-8">
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
            width={140}
            height={48}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
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

        <form
          onSubmit={onSearch}
          className="hidden max-w-[320px] flex-1 items-center gap-2 rounded-full border border-blush-300 bg-blush-100 px-4 py-2 md:flex"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a7773" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="text"
            placeholder="Search dresses, lingerie, accessories…"
            className="flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </form>

        <div className="flex items-center gap-1">
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

      {/* Mobile-only persistent search row */}
      <form
        onSubmit={onSearch}
        className="flex items-center gap-2 border-t border-blush-100 bg-cream px-4 py-2 md:hidden"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7773" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="text"
          placeholder="Search dresses, bikinis, sets…"
          className="flex-1 bg-transparent font-sans text-[13px] text-ink outline-none placeholder:text-ink-muted"
        />
      </form>

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
```

- [ ] **Step 2: Verify type-check + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: pass.

- [ ] **Step 3: Manual smoke**

`npm run dev`. On mobile width and desktop:
- Search bar is always visible (under the marquee on mobile, centered between nav and icons on desktop)
- Submitting routes to `/shop?q=…`
- The old "click magnifier to expand" interaction is gone

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(header): make search bar always visible on mobile + desktop"
```

---

## Task 1.5: Wire `MobileBottomNav` into the layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read current layout**

```bash
cat src/app/layout.tsx
```

Identify where the closing `</CartProvider>` (or equivalent) is — `MobileBottomNav` must render *inside* the cart provider.

- [ ] **Step 2: Add the import + render**

Add at the top of the file with the other component imports:

```tsx
import { MobileBottomNav } from "@/components/MobileBottomNav";
```

Inside the JSX body, render `<MobileBottomNav />` immediately before the closing `</CartProvider>` (or after `<Footer />` if footer is inside the provider, before the provider closes). The component must be a direct child of the cart-provider tree because it consumes `useCart()`.

- [ ] **Step 3: Set `pb-[64px]` on mobile so content isn't covered**

The bottom nav is 64px tall on mobile. Wrap the children with a class that adds bottom padding only on mobile so the nav doesn't overlay the footer or content. Modify the existing main wrapper (or add one) to include `pb-[64px] md:pb-0` near where children render.

If the layout doesn't currently wrap children, add a div around `{children}`:

```tsx
<div className="pb-[64px] md:pb-0">{children}</div>
```

(This goes around `{children}` and `<Footer />` together, OR just `{children}` if the bottom nav should sit below the footer too — pick whichever lets the existing footer still be reachable. The footer should be reachable on mobile by scrolling past the bottom nav, so wrap only `{children}`.)

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
npm run build
```

Expected: pass.

- [ ] **Step 5: Manual smoke**

`npm run dev` → mobile viewport (DevTools). Confirm:
- Bottom nav visible on every page
- Cart icon shows count when items are added
- Tapping Cart opens the drawer
- Bottom nav hidden on `md:` and above
- Footer is reachable by scrolling past the nav

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): mount MobileBottomNav site-wide"
```

---

# Phase 2 — Home page

After this phase, `/` renders the new flow: Hero bento → Trending → Categories → Sales of Month → New Arrivals → Doll Rewards → Reviews → Babe Essentials → Newsletter.

## Task 2.1: `HeroBento` with synchronized float

**Files:**
- Modify: `src/lib/products.ts` (add `listFeatured`)
- Create: `src/components/home/HeroBento.tsx`

- [ ] **Step 1: Add `listFeatured` to `products.ts`**

Append to `src/lib/products.ts`:

```ts
/**
 * Returns up to 5 "featured" products for the hero bento.
 * Strategy: products tagged `featured` first, then fall back to most recent.
 */
export async function listFeatured(): Promise<HttpTypes.StoreProduct[]> {
  // Try the explicit "featured" tag first
  try {
    const tagged = await listProducts({ tag: "featured", limit: 5 });
    if (tagged.products.length >= 3) return tagged.products.slice(0, 5);
  } catch {
    // fall through
  }
  const recent = await listProducts({ order: "-created_at", limit: 5 });
  return recent.products.slice(0, 5);
}
```

Note: `listProducts` already accepts `tag` and forwards it as `tag_id`. If the Medusa store uses tag values rather than IDs, this returns nothing — that's fine, the fallback handles it.

- [ ] **Step 2: Create `HeroBento.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";

type Product = HttpTypes.StoreProduct;

/**
 * Bento mosaic hero — 5 portrait tiles, varied sizes, synchronized float animation.
 * Each tile is a clickable Link to the product's PDP.
 * No badges, no prices, no overlays — the photo speaks for itself.
 *
 * Layout:
 *   ┌─────────┬───┬───┐
 *   │         │ T │ T │
 *   │ FEATURE ├───┼───┤
 *   │         │ T │ T │
 *   └─────────┴───┴───┘
 *
 * Animation: each tile floats up/down on a 6s cycle, staggered by 0.5s.
 * Wrapped in @media (prefers-reduced-motion: no-preference) so OS-level
 * reduce-motion users see static tiles.
 */
export function HeroBento({ products }: { products: Product[] }) {
  if (products.length < 3) return null; // bail rather than render a thin hero

  const [feature, ...rest] = products;
  const stacked = rest.slice(0, 4);

  const tile = (p: Product, key: string, ratio: string, animClass: string) => {
    const img = p.thumbnail ?? p.images?.[0]?.url;
    return (
      <Link
        key={`${key}-${p.id}`}
        href={`/products/${p.handle}`}
        className={`hero-bento-tile ${animClass} group relative block overflow-hidden rounded-xl bg-blush-100 shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(229,96,74,0.22)]`}
        style={{ aspectRatio: ratio }}
      >
        {img && (
          <Image
            src={img}
            alt={p.title}
            fill
            sizes={
              key === "feature"
                ? "(max-width: 768px) 60vw, 30vw"
                : "(max-width: 768px) 30vw, 12vw"
            }
            className="object-cover object-top"
            priority={key === "feature"}
          />
        )}
      </Link>
    );
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0]">
      <div className="absolute -right-20 -top-20 h-[220px] w-[220px] rounded-full bg-white/45" aria-hidden />
      <div className="absolute -bottom-8 -left-8 h-[120px] w-[120px] rounded-full bg-coral-500/15" aria-hidden />
      <span className="absolute right-20 top-12 font-display text-[22px] text-coral-500" style={{ transform: "rotate(15deg)" }} aria-hidden>✦</span>

      <div className="relative mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:px-10 md:py-16">
        {/* Text column */}
        <div>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-3.5">
            ★ This week's drop
          </p>
          <h1 className="font-display text-[44px] leading-[0.92] tracking-[-1.5px] text-ink md:text-[72px]">
            Doll up,
            <br />
            <em className="text-coral-500">babe.</em>
          </h1>
          <p className="mt-4 max-w-[380px] font-sans text-[14px] leading-[1.5] text-ink-soft">
            Mauritius-curated dresses, lingerie &amp; beachwear. Fresh drops every Friday.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/shop?sort=new"
              className="rounded-full bg-ink px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
            >
              Shop new arrivals →
            </Link>
            <Link
              href="/lookbook"
              className="self-end border-b border-ink pb-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              Lookbook
            </Link>
          </div>
        </div>

        {/* Mosaic column — desktop only; mobile uses a simpler 3-tile strip below */}
        <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1fr] md:gap-3">
          <div className="row-span-2 flex">
            {tile(feature, "feature", "2 / 3.2", "anim-1")}
          </div>
          <div className="flex flex-col gap-3">
            {stacked[0] && tile(stacked[0], "s0", "3 / 4", "anim-2")}
            {stacked[1] && tile(stacked[1], "s1", "3 / 4", "anim-3")}
          </div>
          <div className="flex flex-col gap-3">
            {stacked[2] && tile(stacked[2], "s2", "3 / 4", "anim-4")}
            {stacked[3] && tile(stacked[3], "s3", "3 / 4", "anim-5")}
          </div>
        </div>

        {/* Mobile mosaic — 3-tile strip with badges/prices visible (more direct on mobile) */}
        <div className="grid grid-cols-3 gap-1.5 md:hidden">
          {[feature, stacked[0], stacked[1]].filter(Boolean).map((p, i) => {
            const img = p!.thumbnail ?? p!.images?.[0]?.url;
            return (
              <Link
                key={p!.id}
                href={`/products/${p!.handle}`}
                className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/30"
              >
                {img && (
                  <Image
                    src={img}
                    alt={p!.title}
                    fill
                    sizes="33vw"
                    className="object-cover object-top"
                    priority={i === 0}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .hero-bento-tile { will-change: transform; }
          @keyframes float-a { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes float-b { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes float-c { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          .anim-1 { animation: float-a 6s ease-in-out infinite; }
          .anim-2 { animation: float-b 6s ease-in-out 0.5s infinite; }
          .anim-3 { animation: float-c 6s ease-in-out 1.0s infinite; }
          .anim-4 { animation: float-b 6s ease-in-out 1.5s infinite; }
          .anim-5 { animation: float-a 6s ease-in-out 2.0s infinite; }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Step 3: Verify type-check + build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts src/components/home/HeroBento.tsx
git commit -m "feat(home): add HeroBento with synchronized float animation"
```

---

## Task 2.2: `TrendingRail`

**Files:**
- Create: `src/components/home/TrendingRail.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

type Product = HttpTypes.StoreProduct;

export function TrendingRail({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="bg-blush-100 py-5 md:py-7">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
            Trending <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>now</em>
          </h2>
          <Link
            href="/shop?sort=trending"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-coral-500 md:text-[12px]"
          >
            See all →
          </Link>
        </div>
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 10).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        {/* Desktop: 5-up grid */}
        <div className="hidden gap-4 px-10 md:grid md:grid-cols-5">
          {products.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/home/TrendingRail.tsx
git commit -m "feat(home): add TrendingRail (mobile scroll, desktop 5-up)"
```

---

## Task 2.3: `CategoryIcons` (replaces `CategoryStrip`)

**Files:**
- Create: `src/components/home/CategoryIcons.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Add placeholder category images**

Place 5 representative product photos in `public/categories/` named `dresses.jpg`, `lingerie.jpg`, `beachwear.jpg`, `tops.jpg`, `sale.jpg`. If you don't have one yet, use a copy of any existing photo as a temporary placeholder.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/home/CategoryIcons.tsx public/categories/
git commit -m "feat(home): add CategoryIcons round-icon rail"
```

---

## Task 2.4: `SalesOfTheMonth` with countdown

**Files:**
- Create: `src/lib/sales-of-month.ts`
- Create: `src/components/home/SalesOfTheMonth.tsx`

- [ ] **Step 1: Create the config**

```ts
// src/lib/sales-of-month.ts
export type SalesOfMonthConfig = {
  enabled: boolean;
  headline: string;
  percentOff: number;
  endsAt: string; // ISO timestamp
  ctaUrl: string;
  ctaLabel: string;
  description: string;
};

/**
 * Hand-edited config for the home page "Sales of the Month" banner.
 * Edit and redeploy to update the sale. Set `enabled: false` to hide the section.
 *
 * Future: move to Medusa metadata or env vars.
 */
export const salesOfMonthConfig: SalesOfMonthConfig = {
  enabled: false,
  headline: "Sale of the month",
  percentOff: 50,
  endsAt: "2026-05-10T23:59:59+04:00", // Mauritius timezone
  ctaUrl: "/shop?sort=sale",
  ctaLabel: "Shop the sale",
  description: "Selected dresses, bikinis &amp; lingerie. Once it's gone, it's gone.",
};
```

- [ ] **Step 2: Create the component**

```tsx
// src/components/home/SalesOfTheMonth.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { salesOfMonthConfig } from "@/lib/sales-of-month";

type Remaining = { d: number; h: number; m: number; s: number; expired: boolean };

function diff(endsAt: string): Remaining {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { d, h, m, s, expired: false };
}

export function SalesOfTheMonth() {
  const cfg = salesOfMonthConfig;
  const [r, setR] = useState<Remaining>(() => diff(cfg.endsAt));

  useEffect(() => {
    if (!cfg.enabled) return;
    const t = setInterval(() => setR(diff(cfg.endsAt)), 1000);
    return () => clearInterval(t);
  }, [cfg.enabled, cfg.endsAt]);

  if (!cfg.enabled || r.expired) return null;

  const Unit = ({ n, label }: { n: number; label: string }) => (
    <div className="min-w-[52px] rounded-lg bg-white px-2.5 py-1.5">
      <div className="font-display text-[24px] leading-none text-coral-500">{n.toString().padStart(2, "0")}</div>
      <div className="mt-0.5 font-sans text-[8px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink via-[#3a1a16] to-[#5e2418] py-10 text-white md:py-20">
      <div className="absolute -right-24 -top-16 h-[220px] w-[220px] rounded-full bg-coral-500/20" aria-hidden />
      <div className="absolute -bottom-12 -left-12 h-[140px] w-[140px] rounded-full bg-coral-300/15" aria-hidden />
      <div className="relative mx-auto max-w-[680px] px-6 text-center">
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-coral-300">
          — Limited time · ends {new Date(cfg.endsAt).toLocaleDateString("en-MU", { weekday: "long" })} —
        </p>
        <h2 className="font-display text-[36px] leading-[0.95] md:text-[60px]">
          {cfg.headline.split(" of ")[0]}{" "}
          {cfg.headline.includes(" of ") && (
            <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
              of {cfg.headline.split(" of ")[1]}
            </em>
          )}
        </h2>
        <div className="my-3 font-display text-[56px] font-bold leading-none tracking-tight text-coral-500 md:text-[96px]">
          <sup className="text-[24px] text-coral-300">up to</sup>
          {cfg.percentOff}
          <sup className="text-[24px] text-coral-300">%</sup>
        </div>
        <p
          className="mx-auto mb-5 max-w-[420px] font-sans text-[13px] leading-[1.5] text-[#E0CFCB] md:text-[16px]"
          dangerouslySetInnerHTML={{ __html: cfg.description }}
        />
        <div className="mb-6 flex justify-center gap-2">
          <Unit n={r.d} label="Days" />
          <Unit n={r.h} label="Hrs" />
          <Unit n={r.m} label="Min" />
          <Unit n={r.s} label="Sec" />
        </div>
        <Link
          href={cfg.ctaUrl}
          className="inline-block rounded-full bg-coral-500 px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          {cfg.ctaLabel} →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```

Build should pass even though `enabled: false` will keep the section hidden.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sales-of-month.ts src/components/home/SalesOfTheMonth.tsx
git commit -m "feat(home): add SalesOfTheMonth banner with countdown timer"
```

---

## Task 2.5: `NewArrivalsRail` with inline View All tile

**Files:**
- Create: `src/components/home/NewArrivalsRail.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

type Product = HttpTypes.StoreProduct;

const ViewAllTile = ({ count }: { count: number }) => (
  <Link
    href="/shop?sort=new"
    className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-coral-500 to-coral-700 p-5 text-center text-white"
  >
    <div className="mb-2 font-display text-[48px] leading-none">→</div>
    <div className="font-sans text-[11px] font-bold uppercase tracking-[0.14em]">View all</div>
    <div className="mt-1 font-sans text-[10px] opacity-80">{count} new pieces</div>
  </Link>
);

export function NewArrivalsRail({ products, totalCount }: { products: Product[]; totalCount: number }) {
  if (!products.length) return null;
  return (
    <section className="bg-blush-100 py-5 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-end justify-between px-4 pb-3 md:px-10 md:pb-4">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[30px]">
            New <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>arrivals</em>
          </h2>
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted md:text-[12px]">
            ★ Drop · this week
          </span>
        </div>
        {/* Mobile */}
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 4).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
          <div className="w-[150px]">
            <div className="aspect-[3/4.7]">
              <ViewAllTile count={totalCount} />
            </div>
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden grid-cols-5 gap-4 px-10 md:grid">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          <div className="aspect-[3/4.7]">
            <ViewAllTile count={totalCount} />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/home/NewArrivalsRail.tsx
git commit -m "feat(home): add NewArrivalsRail with inline View All tile"
```

---

## Task 2.6: Rewrite `LoyaltyTeaser` with perk cards

**Files:**
- Rewrite: `src/components/home/LoyaltyTeaser.tsx`

- [ ] **Step 1: Replace the file with the new layout**

```tsx
import Link from "next/link";

const PERKS = [
  { icon: "★", body: "Earn **1 point** per Rs 10 spent — redeem on any order." },
  { icon: "⌖", body: "Unlock **early access** to new drops every Friday at 7am." },
  { icon: "♥", body: "Birthday surprise & **free shipping** on first order." },
];

function renderPerk(body: string) {
  // Simple **bold** parser — turns *(.*)* into a coral bold span
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-coral-500">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function LoyaltyTeaser() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FCE9E4] to-cream py-10 md:py-14">
      <div className="absolute right-[-90px] top-12 h-[220px] w-[220px] rounded-full bg-coral-300/20" aria-hidden />
      <div className="relative mx-auto max-w-[1080px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="text-center md:text-left">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">★ Doll Rewards</p>
            <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
              Earn perks
              <br className="hidden md:block" />
              <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                {" "}every drop.
              </em>
            </h2>
            <div className="mt-5 md:text-left">
              <Link
                href="/loyalty"
                className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
              >
                Join Doll Rewards →
              </Link>
              <p className="mt-2 font-sans text-[10px] tracking-wider text-ink-muted">
                Already 1,200+ members · Free to join
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {PERKS.map((p) => (
              <div key={p.icon} className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-[0_2px_6px_rgba(229,96,74,0.06)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[18px] text-white">
                  {p.icon}
                </span>
                <p className="font-sans text-[12px] leading-[1.4] text-ink md:text-[13px]">{renderPerk(p.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/home/LoyaltyTeaser.tsx
git commit -m "feat(home): rewrite LoyaltyTeaser with 3 perk cards + clearer CTA"
```

---

## Task 2.7: Rewrite `Testimonials` as verified-buyer cards

**Files:**
- Rewrite: `src/components/home/Testimonials.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import Image from "next/image";

type Review = {
  initial: string;
  name: string;
  date: string;
  quote: string;
  productName: string;
  productImage: string;
  productHref: string;
};

const REVIEWS: Review[] = [
  {
    initial: "P",
    name: "Priya S.",
    date: "Mar 2026",
    quote: "Quality blew me away — fits perfectly and arrived in 2 days. Already ordered the matching set.",
    productName: "Lace Bralette Set",
    productImage: "/reviews/r1.jpg",
    productHref: "/products/lace-bralette-set",
  },
  {
    initial: "A",
    name: "Anjali M.",
    date: "Mar 2026",
    quote: "Honestly the prettiest dress I own. Got compliments all night at the wedding 💕",
    productName: "Wrap Midi Dress",
    productImage: "/reviews/r2.jpg",
    productHref: "/products/wrap-midi-dress",
  },
  {
    initial: "M",
    name: "Maya R.",
    date: "Feb 2026",
    quote: "My go-to for everything beach. The fit on this bikini is unreal — even the bottoms run true to size.",
    productName: "Triangle Bikini Set",
    productImage: "/reviews/r3.jpg",
    productHref: "/products/triangle-bikini-set",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1080px] px-4 md:px-10">
        <div className="mb-6 text-center">
          <div className="font-display text-[18px] tracking-widest text-coral-500">★ ★ ★ ★ ★</div>
          <h2 className="mt-2 font-display text-[24px] text-ink md:text-[32px]">
            Loved by <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>1,200+</em> babes
          </h2>
          <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Based on 387 verified reviews
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {REVIEWS.map((r) => (
            <article key={r.name} className="rounded-2xl bg-blush-100 p-4">
              <header className="mb-2 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-coral-300 font-sans text-[13px] font-bold text-white">
                  {r.initial}
                </div>
                <div className="flex-1">
                  <div className="font-sans text-[12px] font-bold text-ink">{r.name}</div>
                  <div className="font-sans text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    ✓ Verified · {r.date}
                  </div>
                </div>
                <div className="font-sans text-[12px] tracking-wider text-coral-500">★★★★★</div>
              </header>
              <p className="mb-2 font-sans text-[13px] leading-[1.5] text-ink-soft">"{r.quote}"</p>
              <a href={r.productHref} className="flex items-center gap-2.5 rounded-lg bg-white p-2">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded">
                  <Image src={r.productImage} alt={r.productName} fill sizes="36px" className="object-cover" />
                </div>
                <div className="font-sans text-[10px] leading-tight text-ink">
                  <strong className="block font-bold">{r.productName}</strong>
                  <span className="text-ink-muted">Bought {r.date}</span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add 3 review images to `public/reviews/`**

Place 3 product photos at `public/reviews/r1.jpg`, `r2.jpg`, `r3.jpg` (any existing product photo can be a placeholder). If product handles in REVIEWS don't exist yet, that's fine — they'll just route to a 404 PDP, which is acceptable for now.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/home/Testimonials.tsx public/reviews/
git commit -m "feat(home): rewrite Testimonials as verified-buyer cards w/ products"
```

---

## Task 2.8: `BabeEssentials` bento

**Files:**
- Modify: `src/lib/products.ts` (add `listEssentials`)
- Create: `src/components/home/BabeEssentials.tsx`

- [ ] **Step 1: Add `listEssentials` to `products.ts`**

Append to `src/lib/products.ts`:

```ts
/**
 * Returns up to 4 products from the "essentials" collection or tag.
 * Used by the Babe Essentials bento on the home page.
 */
export async function listEssentials(): Promise<HttpTypes.StoreProduct[]> {
  try {
    const tagged = await listProducts({ tag: "essentials", limit: 4 });
    if (tagged.products.length) return tagged.products.slice(0, 4);
  } catch {}
  try {
    const collected = await listProducts({ collection: "essentials", limit: 4 });
    if (collected.products.length) return collected.products.slice(0, 4);
  } catch {}
  return [];
}
```

- [ ] **Step 2: Create the component**

```tsx
// src/components/home/BabeEssentials.tsx
import Link from "next/link";
import Image from "next/image";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

function Tile({
  product,
  className,
  big = false,
}: {
  product: Product;
  className?: string;
  big?: boolean;
}) {
  const img = product.thumbnail ?? product.images?.[0]?.url;
  const price = getDisplayPrice(product);
  return (
    <Link
      href={`/products/${product.handle}`}
      className={`group relative block overflow-hidden rounded-xl bg-blush-100 shadow-[0_4px_10px_rgba(229,96,74,0.08)] transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(229,96,74,0.2)] ${className ?? ""}`}
    >
      {img && (
        <Image
          src={img}
          alt={product.title}
          fill
          sizes={big ? "(max-width: 768px) 100vw, 40vw" : "(max-width: 768px) 50vw, 20vw"}
          className="object-cover object-top"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
      <div className="absolute inset-x-3 bottom-3 text-white md:inset-x-4 md:bottom-4">
        <h3 className={`font-display leading-none ${big ? "text-[18px] md:text-[22px]" : "text-[14px] md:text-[18px]"}`}>
          {product.title}
        </h3>
        <p className="mt-1.5 font-sans text-[11px] font-bold opacity-95 md:text-[12px]">
          {formatPrice(price.amount, price.currency)}
        </p>
      </div>
    </Link>
  );
}

export function BabeEssentials({ products }: { products: Product[] }) {
  if (!products.length) return null;
  const [hero, ...rest] = products;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-[1100px] px-4 md:px-10">
        <header className="mb-6 text-center">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">★ Wardrobe heroes</p>
          <h2 className="font-display text-[28px] leading-none text-ink md:text-[36px]">
            Babe <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>essentials</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] font-sans text-[12px] leading-[1.5] text-ink-muted md:text-[14px]">
            The little extras that make every look hit harder.
          </p>
        </header>

        {/* Mobile: 1 big + 2 stacked = 3 tiles */}
        <div className="grid grid-cols-2 gap-2 md:hidden" style={{ gridTemplateRows: "200px 200px" }}>
          <Tile product={hero} className="col-span-2 row-start-1" big />
          {rest[0] && <Tile product={rest[0]} />}
          {rest[1] && <Tile product={rest[1]} />}
        </div>

        {/* Desktop: 1 tall left + 2 top right + 1 wide bottom = 4 tiles */}
        <div className="hidden md:grid md:gap-3" style={{ gridTemplateColumns: "1.4fr 1fr 1fr", gridTemplateRows: "220px 220px" }}>
          <div className="row-span-2"><Tile product={hero} big /></div>
          {rest[0] && <Tile product={rest[0]} />}
          {rest[1] && <Tile product={rest[1]} />}
          {rest[2] && <Tile product={rest[2]} className="col-span-2" />}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts src/components/home/BabeEssentials.tsx
git commit -m "feat(home): add BabeEssentials bento (boob tape, nipple covers, etc.)"
```

---

## Task 2.9: Newsletter band — visual polish only

**Files:**
- Modify: `src/components/Footer.tsx` OR `src/components/NewsletterForm.tsx`

The current newsletter sits inside `Footer.tsx` as a `<section className="bg-coral-500 ...">`. The redesign keeps it but tightens the form into a single-row pill.

- [ ] **Step 1: Open `src/components/Footer.tsx` and find the `<NewsletterForm />` invocation**

The current copy reads "Get early access to new drops & exclusive offers" which is already aligned with the spec. Leave the structure but adjust typography:

In `Footer.tsx`, change the newsletter section's container heading hierarchy if needed (verify by reading current code). If the copy already matches, skip changes.

- [ ] **Step 2: Open `src/components/NewsletterForm.tsx` and update the form to a single-row pill**

Replace the form JSX inside `NewsletterForm.tsx` with a layout matching:

```tsx
<form
  onSubmit={onSubmit}
  className="flex max-w-[440px] items-center gap-1.5 rounded-full bg-white/15 p-1 pl-4"
>
  <input
    type="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="your@email.com"
    className="flex-1 bg-transparent font-sans text-[13px] text-white outline-none placeholder:text-white/70"
  />
  <button
    type="submit"
    disabled={busy}
    className="rounded-full bg-ink px-3.5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
  >
    {busy ? "..." : "Subscribe"}
  </button>
</form>
```

(Adapt the surrounding state / submit handler from the existing component — don't replace those.)

- [ ] **Step 3: Verify + smoke**

```bash
npx tsc --noEmit
npm run dev
```

Newsletter form on the home page footer renders as one rounded pill.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsletterForm.tsx src/components/Footer.tsx
git commit -m "style(newsletter): tighten form into single-row pill"
```

---

## Task 2.10: Wire new home page + delete old components

**Files:**
- Rewrite: `src/app/page.tsx`
- Delete: `src/components/home/HeroA.tsx`, `CategoryStrip.tsx`, `NewArrivals.tsx`, `EditorialBanner.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { listFeatured, listProducts, listEssentials } from "@/lib/products";
import { HeroBento } from "@/components/home/HeroBento";
import { TrendingRail } from "@/components/home/TrendingRail";
import { CategoryIcons } from "@/components/home/CategoryIcons";
import { SalesOfTheMonth } from "@/components/home/SalesOfTheMonth";
import { NewArrivalsRail } from "@/components/home/NewArrivalsRail";
import { LoyaltyTeaser } from "@/components/home/LoyaltyTeaser";
import { Testimonials } from "@/components/home/Testimonials";
import { BabeEssentials } from "@/components/home/BabeEssentials";

export const revalidate = 60;

export default async function HomePage() {
  // Fan-out fetch the four data sources we need on home in parallel
  const [featured, trendingRes, newArrivalsRes, essentials] = await Promise.all([
    listFeatured().catch((err) => {
      console.error("listFeatured failed:", err);
      return [];
    }),
    listProducts({ tag: "trending", limit: 10 }).catch(() =>
      listProducts({ order: "-created_at", limit: 10 }).catch(() => ({ products: [], count: 0, region: null! })),
    ),
    listProducts({ order: "-created_at", limit: 10 }).catch(() => ({ products: [], count: 0, region: null! })),
    listEssentials().catch((err) => {
      console.error("listEssentials failed:", err);
      return [];
    }),
  ]);

  return (
    <>
      <HeroBento products={featured} />
      <TrendingRail products={trendingRes.products} />
      <CategoryIcons />
      <SalesOfTheMonth />
      <NewArrivalsRail products={newArrivalsRes.products.slice(0, 4)} totalCount={newArrivalsRes.count ?? 0} />
      <LoyaltyTeaser />
      <Testimonials />
      <BabeEssentials products={essentials} />
    </>
  );
}
```

- [ ] **Step 2: Delete the old components**

```bash
rm src/components/home/HeroA.tsx src/components/home/CategoryStrip.tsx src/components/home/NewArrivals.tsx src/components/home/EditorialBanner.tsx
```

- [ ] **Step 3: Verify build (catches any stray imports of deleted components)**

```bash
npx tsc --noEmit
npm run build
```

If `build` fails because of a stray import elsewhere, grep + remove:

```bash
npx tsc --noEmit 2>&1 | grep -E "HeroA|CategoryStrip|NewArrivals|EditorialBanner"
```

- [ ] **Step 4: Manual smoke**

`npm run dev` → visit `/`. Verify section order matches spec:
1. Hero bento (5 floating tiles desktop, 3-strip mobile)
2. Trending rail
3. Round category icons
4. Sales of the Month (hidden because `enabled: false`)
5. New Arrivals rail with View All tile at end
6. Doll Rewards
7. Reviews
8. Babe Essentials (hidden if no products tagged `essentials` — that's expected)
9. Newsletter band

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(home): rewire homepage in new section order; delete legacy components"
```

---

# Phase 3 — Shop page

After this phase, `/shop` uses filter chips + sticky bar on mobile, sidebar on desktop, and the new card grid (2/4 cols).

## Task 3.1: `ShopFilterChips` (mobile)

**Files:**
- Create: `src/components/shop/ShopFilterChips.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Chip = { key: string; label: string; type: "filter" | "facet" };

const FACET_KEYS = ["category", "size", "color", "price"];
const CATEGORIES = ["dresses", "lingerie", "beachwear", "accessories"];

export function ShopFilterChips({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();

  const activeCategory = params.get("category");
  const sort = params.get("sort") ?? "new";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  };

  return (
    <div className="sticky top-0 z-[5] flex gap-2 overflow-x-auto border-b border-blush-100 bg-white px-4 py-2.5 md:hidden">
      <button
        onClick={onOpenFilters}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-blush-300 bg-blush-100 px-3.5 py-2 font-sans text-[11px] font-semibold text-ink"
      >
        ⚙ Filters
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => setParam("category", activeCategory === c ? null : c)}
          className={`shrink-0 rounded-full border px-3.5 py-2 font-sans text-[11px] font-semibold capitalize ${
            activeCategory === c
              ? "border-ink bg-ink text-white"
              : "border-blush-400 bg-white text-ink"
          }`}
        >
          {c}
          {activeCategory === c && <span className="ml-1 opacity-60">×</span>}
        </button>
      ))}
      <button
        onClick={() => setParam("sort", sort === "new" ? "popular" : "new")}
        className="shrink-0 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[11px] font-semibold text-ink"
      >
        Sort: {sort === "new" ? "Newest" : "Popular"} ▾
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shop/ShopFilterChips.tsx
git commit -m "feat(shop): add ShopFilterChips for mobile"
```

---

## Task 3.2: `ShopFilterSheet` (mobile bottom sheet)

**Files:**
- Create: `src/components/shop/ShopFilterSheet.tsx`

- [ ] **Step 1: Create the sheet**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = [
  { value: "coral", hex: "#E5604A" },
  { value: "black", hex: "#1c1010" },
  { value: "blush", hex: "#F2DDD8" },
  { value: "white", hex: "#FFFFFF" },
  { value: "green", hex: "#3a5a40" },
  { value: "blue", hex: "#85C1E9" },
  { value: "yellow", hex: "#F4D03F" },
];

export function ShopFilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const params = useSearchParams();

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value == null) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  };
  const has = (key: string, val: string) => params.get(key) === val;

  return (
    <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-label="Filters">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[20px] text-ink">Filters</h3>
          <button onClick={onClose} className="font-sans text-[11px] font-semibold uppercase tracking-wider text-coral-500">
            Done
          </button>
        </div>

        <FilterGroup label="Size">
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setParam("size", has("size", s) ? null : s)}
                className={`rounded-md border py-2 font-sans text-[11px] font-semibold ${
                  has("size", s) ? "border-ink bg-ink text-white" : "border-blush-400 bg-white text-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setParam("color", has("color", c.value) ? null : c.value)}
                aria-label={c.value}
                className={`h-7 w-7 rounded-full border-2 border-white ${
                  has("color", c.value) ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Price (Rs)">
          <p className="font-sans text-[12px] text-ink-muted">Range filter — wired up later when we have a price slider component.</p>
        </FilterGroup>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 border-b border-blush-100 pb-5 last:border-0">
      <h4 className="mb-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">{label}</h4>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shop/ShopFilterSheet.tsx
git commit -m "feat(shop): add mobile ShopFilterSheet bottom-sheet"
```

---

## Task 3.3: `ShopFilterSidebar` (desktop)

**Files:**
- Create: `src/components/shop/ShopFilterSidebar.tsx`

- [ ] **Step 1: Create the sidebar**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { slug: "dresses", label: "Dresses" },
  { slug: "lingerie", label: "Lingerie" },
  { slug: "beachwear", label: "Beachwear" },
  { slug: "accessories", label: "Accessories" },
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS = [
  { value: "coral", hex: "#E5604A" },
  { value: "black", hex: "#1c1010" },
  { value: "blush", hex: "#F2DDD8" },
  { value: "white", hex: "#FFFFFF" },
  { value: "grey", hex: "#8a7773" },
  { value: "green", hex: "#3a5a40" },
];

export function ShopFilterSidebar() {
  const router = useRouter();
  const params = useSearchParams();

  const has = (key: string, val: string) => params.get(key) === val;
  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    router.push(`/shop?${next.toString()}`);
  };
  const clearAll = () => router.push("/shop");

  return (
    <aside className="hidden w-[230px] shrink-0 rounded-2xl border border-blush-100 bg-white p-4 shadow-[0_1px_4px_rgba(229,96,74,0.04)] md:block">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[18px] leading-none text-ink">Filters</h3>
        <button onClick={clearAll} className="font-sans text-[11px] font-bold uppercase tracking-wider text-coral-500">
          Clear all
        </button>
      </header>

      <Group label="Category">
        {CATEGORIES.map((c) => (
          <label key={c.slug} className="flex cursor-pointer items-center gap-2 py-1.5 font-sans text-[13px] text-ink">
            <input
              type="checkbox"
              checked={has("category", c.slug)}
              onChange={() => setParam("category", has("category", c.slug) ? null : c.slug)}
              className="accent-coral-500"
            />
            {c.label}
          </label>
        ))}
      </Group>

      <Group label="Size">
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setParam("size", has("size", s) ? null : s)}
              className={`rounded-md border py-1.5 font-sans text-[11px] font-semibold ${
                has("size", s) ? "border-ink bg-ink text-white" : "border-blush-400 bg-white text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setParam("color", has("color", c.value) ? null : c.value)}
              aria-label={c.value}
              className={`h-6 w-6 rounded-full border-2 border-white ${
                has("color", c.value) ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
              }`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </Group>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 border-b border-blush-100 pb-4 last:mb-0 last:border-0 last:pb-0">
      <h4 className="mb-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">{label}</h4>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shop/ShopFilterSidebar.tsx
git commit -m "feat(shop): add ShopFilterSidebar for desktop"
```

---

## Task 3.4: `ShopStickyBar` (mobile)

**Files:**
- Create: `src/components/shop/ShopStickyBar.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ShopStickyBar({ onOpenFilters }: { onOpenFilters: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const sort = params.get("sort") ?? "new";

  const cycle = () => {
    const order = ["new", "popular", "price-asc", "price-desc"];
    const i = order.indexOf(sort);
    const next = order[(i + 1) % order.length];
    const p = new URLSearchParams(params.toString());
    p.set("sort", next);
    router.push(`/shop?${p.toString()}`);
  };

  const labels: Record<string, string> = {
    new: "Newest",
    popular: "Popular",
    "price-asc": "Price ↑",
    "price-desc": "Price ↓",
  };

  return (
    <div className="sticky bottom-[64px] z-[10] flex gap-2 border-t border-blush-100 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
      <button
        onClick={onOpenFilters}
        className="flex-1 rounded-full border border-blush-400 bg-white py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
      >
        ⚙ Filters
      </button>
      <button
        onClick={cycle}
        className="flex-1 rounded-full bg-ink py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
      >
        Sort: {labels[sort] ?? "Newest"} ▾
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/shop/ShopStickyBar.tsx
git commit -m "feat(shop): add mobile sticky filter+sort bar"
```

---

## Task 3.5: `ShopSortDropdown` (desktop)

**Files:**
- Create: `src/components/shop/ShopSortDropdown.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function ShopSortDropdown() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("sort") ?? "new";

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = new URLSearchParams(params.toString());
    p.set("sort", e.target.value);
    router.push(`/shop?${p.toString()}`);
  };

  return (
    <label className="hidden items-center gap-2 rounded-full border border-blush-400 bg-white px-3.5 py-2 font-sans text-[12px] font-semibold text-ink md:flex">
      <span>Sort:</span>
      <select value={current} onChange={onChange} className="cursor-pointer bg-transparent outline-none">
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/shop/ShopSortDropdown.tsx
git commit -m "feat(shop): add ShopSortDropdown for desktop"
```

---

## Task 3.6: Wire `/shop` page + delete old `ShopFilters`

**Files:**
- Rewrite: `src/app/shop/page.tsx`
- Delete: `src/components/shop/ShopFilters.tsx`

- [ ] **Step 1: Read current shop page**

```bash
cat src/app/shop/page.tsx
```

Identify how it loads and renders products, the current pagination, and which filters it accepts (Next.js 16 — `searchParams` is a Promise<…>).

- [ ] **Step 2: Rewrite the page**

Pseudo-structure (preserve existing data fetching logic; replace UI):

```tsx
import { Suspense } from "react";
import { listProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilterChips } from "@/components/shop/ShopFilterChips";
import { ShopFilterSheet } from "@/components/shop/ShopFilterSheet";
import { ShopFilterSidebar } from "@/components/shop/ShopFilterSidebar";
import { ShopStickyBar } from "@/components/shop/ShopStickyBar";
import { ShopSortDropdown } from "@/components/shop/ShopSortDropdown";

export const revalidate = 60;

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const sp = await searchParams;
  const limit = 24;
  const page = Number(sp.page ?? 1);

  const { products, count } = await listProducts({
    limit,
    offset: (page - 1) * limit,
    q: typeof sp.q === "string" ? sp.q : undefined,
    category: typeof sp.category === "string" ? sp.category : undefined,
    order: typeof sp.sort === "string" && sp.sort === "new" ? "-created_at" : undefined,
  });

  const heading = typeof sp.category === "string" ? sp.category : "All products";

  return (
    <main>
      <ShopHeader heading={heading} count={count} />

      {/* Mobile chips */}
      <ShopMobileShell>
        <div className="grid grid-cols-2 gap-2.5 px-4 py-3 md:hidden">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </ShopMobileShell>

      {/* Desktop body */}
      <div className="mx-auto hidden max-w-[1280px] gap-6 px-8 pb-12 md:grid md:grid-cols-[230px_1fr]">
        <ShopFilterSidebar />
        <div className="grid grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ShopHeader({ heading, count }: { heading: string; count: number }) {
  return (
    <div className="border-b border-blush-100 bg-white px-4 py-4 md:flex md:items-end md:justify-between md:px-8 md:py-6">
      <div>
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Home / Shop</p>
        <h1 className="mt-1 font-display text-[28px] capitalize leading-none text-ink md:text-[44px]">
          {heading} <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>collection</em>
        </h1>
        <p className="mt-1.5 font-sans text-[11px] text-ink-muted md:text-[12px]">{count} styles</p>
      </div>
      <div className="mt-3 md:mt-0">
        <ShopSortDropdown />
      </div>
    </div>
  );
}

// Wraps the mobile shell so we can host the filter sheet and the sticky bar
// without making the page itself a client component.
function ShopMobileShell({ children }: { children: React.ReactNode }) {
  return <ShopMobileClient>{children}</ShopMobileClient>;
}
```

- [ ] **Step 3: Add `ShopMobileClient` wrapper**

Create `src/components/shop/ShopMobileClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ShopFilterChips } from "./ShopFilterChips";
import { ShopFilterSheet } from "./ShopFilterSheet";
import { ShopStickyBar } from "./ShopStickyBar";

export function ShopMobileClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <ShopFilterChips onOpenFilters={() => setOpen(true)} />
      {children}
      <ShopStickyBar onOpenFilters={() => setOpen(true)} />
      <ShopFilterSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
```

Update the import in `shop/page.tsx`:

```tsx
import { ShopMobileClient } from "@/components/shop/ShopMobileClient";
```

And replace `ShopMobileShell` usage with `ShopMobileClient`.

- [ ] **Step 4: Delete `ShopFilters.tsx`**

```bash
rm src/components/shop/ShopFilters.tsx
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Manual smoke**

`npm run dev` → `/shop`:
- Mobile: chips strip at top, grid 2-col, sticky filter+sort bar at bottom
- Tap "Filters" → bottom sheet slides up; tap a size → URL updates
- Desktop: sidebar on left with category checkboxes / size grid / color swatches; grid 4-col on right
- Sort dropdown changes URL ?sort=…

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shop): rebuild /shop with chips, sheet, sidebar, sort"
```

---

# Phase 4 — PDP

After this phase, `/products/[handle]` uses the peek-carousel on mobile, 90px-thumb gallery on desktop, sticky ATC, accordion, reviews, and "you may also like" rail.

## Task 4.1: `ProductGalleryMobile` (peek carousel)

**Files:**
- Create: `src/components/product/ProductGalleryMobile.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Img = { url: string; alt?: string };

/**
 * Mobile gallery — full-width swipe carousel where ~10% of the next image
 * is always visible on the right edge, hinting at more content. Dots + counter
 * overlay at the bottom, heart at top-right.
 *
 * Implementation: horizontal scroll snap container, where each slide is 90% wide
 * and snaps to its left edge. The remaining 10% reveals the next slide.
 */
export function ProductGalleryMobile({ images, alt }: { images: Img[]; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const slideWidth = el.clientWidth * 0.9;
    const idx = Math.round(el.scrollLeft / slideWidth);
    if (idx !== active) setActive(Math.min(idx, images.length - 1));
  };

  if (!images.length) {
    return (
      <div className="aspect-[3/4] w-full bg-blush-100" aria-label="No images" />
    );
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((img, i) => (
          <div
            key={img.url}
            className="relative aspect-[3/4] w-[90%] shrink-0 snap-start"
          >
            <Image
              src={img.url}
              alt={img.alt ?? alt ?? ""}
              fill
              sizes="90vw"
              className="object-cover object-top"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Counter (bottom-right) */}
      <div className="absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-1 font-sans text-[10px] font-semibold text-white">
        {active + 1} / {images.length}
      </div>

      {/* Dots (bottom-center) */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full bg-white transition-all ${
              i === active ? "w-4 opacity-100" : "w-1.5 opacity-60"
            }`}
          />
        ))}
      </div>

      {/* Wishlist heart (top-right) */}
      <button
        aria-label="Add to wishlist"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-md"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/product/ProductGalleryMobile.tsx
git commit -m "feat(pdp): add mobile peek-carousel gallery"
```

---

## Task 4.2: `ProductGalleryDesktop` (90px thumbs)

**Files:**
- Create: `src/components/product/ProductGalleryDesktop.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";

type Img = { url: string; alt?: string };

/**
 * Desktop gallery — vertical column of 90px-wide 3:4 thumbs (sticky to viewport)
 * + a large 3:4 main image. Click a thumb to swap the main. Click the main to
 * toggle a CSS-only zoom (cursor: zoom-in/out, no modal in v1).
 */
export function ProductGalleryDesktop({ images, alt }: { images: Img[]; alt?: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!images.length) {
    return (
      <div className="hidden aspect-[3/4] w-full rounded-2xl bg-blush-100 md:block" />
    );
  }

  const main = images[active] ?? images[0];

  return (
    <div className="hidden gap-4 md:flex">
      <div className="sticky top-6 flex h-fit w-[90px] shrink-0 flex-col gap-2.5">
        {images.map((img, i) => (
          <button
            key={img.url}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-blush-100 ${
              i === active ? "outline outline-2 outline-coral-500" : ""
            }`}
          >
            <Image src={img.url} alt="" fill sizes="90px" className="object-cover object-top" />
          </button>
        ))}
      </div>
      <div
        className={`relative aspect-[3/4] flex-1 overflow-hidden rounded-2xl bg-blush-100 ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        onClick={() => setZoomed((z) => !z)}
      >
        <Image
          src={main.url}
          alt={main.alt ?? alt ?? ""}
          fill
          sizes="(max-width: 1280px) 50vw, 600px"
          className={`object-cover object-top transition-transform duration-300 ${
            zoomed ? "scale-150" : "scale-100"
          }`}
          priority
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink">
          ⊕ Click to {zoomed ? "exit" : "zoom"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/product/ProductGalleryDesktop.tsx
git commit -m "feat(pdp): add desktop 90px-thumb gallery with click-to-zoom"
```

---

## Task 4.3: `ProductGallery` router (uses media query)

**Files:**
- Rewrite: `src/components/product/ProductGallery.tsx`

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import type { HttpTypes } from "@medusajs/types";
import { useMediaQuery, DESKTOP_QUERY } from "@/lib/hooks/useMediaQuery";
import { ProductGalleryMobile } from "./ProductGalleryMobile";
import { ProductGalleryDesktop } from "./ProductGalleryDesktop";

export function ProductGallery({ product }: { product: HttpTypes.StoreProduct }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const images = (product.images ?? []).map((i) => ({ url: i.url, alt: product.title }));
  if (!images.length && product.thumbnail) images.push({ url: product.thumbnail, alt: product.title });

  // Render the matching layout. The non-matching layout returns null because each
  // child internally uses `hidden md:flex` / mobile-only classes — but to avoid
  // shipping both DOM trees we conditionally pick one once the JS hydrates.
  if (isDesktop) return <ProductGalleryDesktop images={images} alt={product.title} />;
  return <ProductGalleryMobile images={images} alt={product.title} />;
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/product/ProductGallery.tsx
git commit -m "refactor(pdp): make ProductGallery a media-query router"
```

---

## Task 4.4: Rewrite `ProductBuy`

**Files:**
- Rewrite: `src/components/product/ProductBuy.tsx`

- [ ] **Step 1: Read the current file** to understand variant matching

```bash
cat src/components/product/ProductBuy.tsx
```

The existing variant-matching logic (`useMemo` over `selected`/`variants`/`options`) is correct — keep it. We're rewriting the visual structure: stock signal, color dots, size grid, urgency, trust strip.

- [ ] **Step 2: Replace with the redesigned version**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice, formatDiscountPercent } from "@/lib/format";

type Product = HttpTypes.StoreProduct;
const LOW_STOCK_THRESHOLD = 5;

export function ProductBuy({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const options = useMemo(() => product.options ?? [], [product.options]);
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const initialOptions = useMemo(() => {
    const v = variants[0];
    const map: Record<string, string> = {};
    v?.options?.forEach((o) => {
      if (o.option_id) map[o.option_id] = o.value ?? "";
    });
    return map;
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(initialOptions);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const matchedVariant = useMemo(() => {
    if (!options.length) return variants[0] ?? null;
    return (
      variants.find((v) =>
        v.options?.every((o) => (o.option_id ? selected[o.option_id] === o.value : true)),
      ) ?? null
    );
  }, [variants, options, selected]);

  const price = matchedVariant ? getDisplayPrice({ variants: [matchedVariant] }) : getDisplayPrice(product);
  const inStock =
    matchedVariant && (!matchedVariant.manage_inventory || (matchedVariant.inventory_quantity ?? 0) > 0);
  const lowStockQty =
    matchedVariant?.manage_inventory &&
    matchedVariant.inventory_quantity != null &&
    matchedVariant.inventory_quantity > 0 &&
    matchedVariant.inventory_quantity < LOW_STOCK_THRESHOLD
      ? matchedVariant.inventory_quantity
      : null;
  const discountPct = formatDiscountPercent(price.amount, price.original);

  const colorOption = options.find((o) => (o.title ?? "").toLowerCase() === "color");
  const sizeOption = options.find((o) => (o.title ?? "").toLowerCase() === "size");
  const otherOptions = options.filter((o) => o !== colorOption && o !== sizeOption);

  const handleAdd = async () => {
    if (options.some((o) => !selected[o.id])) {
      setError("Please choose every option");
      return;
    }
    if (!matchedVariant) {
      setError("This combination is unavailable");
      return;
    }
    setError(null);
    try {
      await addItem(matchedVariant.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-[28px] leading-tight text-ink md:text-[36px]">{product.title}</h1>
        <a href="#reviews" className="mt-2 flex items-center gap-2 font-sans text-[12px] font-semibold text-ink-muted">
          <span className="tracking-widest text-coral-500">★★★★★</span>
          <span className="border-b border-blush-300 pb-px text-ink">4.8 · 48 reviews</span>
        </a>
      </header>

      <div className="flex items-baseline gap-3">
        <span className="font-display text-[28px] leading-none text-coral-500 md:text-[36px]">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="font-sans text-[14px] text-ink-muted line-through md:text-[16px]">
            {formatPrice(price.original, price.currency)}
          </span>
        )}
        {discountPct && (
          <span className="rounded bg-blush-100 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wider text-coral-500">
            Save {discountPct.replace("-", "")}
          </span>
        )}
      </div>

      <p className="-mt-3 font-sans text-[11px] font-bold uppercase tracking-wider text-emerald-700">
        {inStock ? (lowStockQty ? `⚠ Only ${lowStockQty} left` : "● In stock — Ships in 1-2 days") : "Sold out"}
      </p>

      {colorOption && (
        <OptionGroup
          title={`Color${selected[colorOption.id] ? `: ${selected[colorOption.id]}` : ""}`}
          values={(colorOption.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[colorOption.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [colorOption.id]: v }))}
          variant="color"
        />
      )}

      {sizeOption && (
        <OptionGroup
          title="Size"
          values={(sizeOption.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[sizeOption.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [sizeOption.id]: v }))}
          variant="size"
          rightLink={{ href: "/size-guide", label: "Size guide →" }}
        />
      )}

      {otherOptions.map((opt) => (
        <OptionGroup
          key={opt.id}
          title={opt.title ?? ""}
          values={(opt.values ?? []).map((v) => v.value).filter(Boolean) as string[]}
          selected={selected[opt.id]}
          onSelect={(v) => setSelected((s) => ({ ...s, [opt.id]: v }))}
          variant="size"
        />
      ))}

      {error && <p className="font-sans text-xs text-coral-700">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={loading || !inStock}
          className={`flex-1 rounded-full py-4 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors disabled:opacity-60 ${
            added ? "bg-emerald-600" : "bg-ink hover:bg-ink-soft"
          }`}
        >
          {!inStock ? "Sold Out" : added ? "✓ Added to Bag" : loading ? "Adding…" : "Add to Bag"}
        </button>
        <button
          aria-label="Add to wishlist"
          className="flex h-12 w-14 items-center justify-center rounded-full border border-ink bg-white text-ink"
        >
          ♡
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 border-y border-blush-100 py-4 font-sans text-[10px] font-semibold uppercase tracking-wider text-ink">
        {[
          { ico: "⌖", line1: "Free shipping", line2: "Rs 999+" },
          { ico: "↺", line1: "7-day", line2: "returns" },
          { ico: "✦", line1: "COD", line2: "available" },
        ].map((t) => (
          <div key={t.line1} className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[18px] text-coral-500">{t.ico}</span>
            <span>{t.line1}</span>
            <span>{t.line2}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  values,
  selected,
  onSelect,
  variant,
  rightLink,
}: {
  title: string;
  values: string[];
  selected: string | undefined;
  onSelect: (v: string) => void;
  variant: "color" | "size";
  rightLink?: { href: string; label: string };
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-ink">{title}</span>
        {rightLink && (
          <a href={rightLink.href} className="font-sans text-[11px] font-semibold text-coral-500">
            {rightLink.label}
          </a>
        )}
      </div>
      {variant === "color" ? (
        <div className="flex flex-wrap gap-2.5">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              aria-label={v}
              className={`h-8 w-8 rounded-full border-2 border-white ${
                selected === v ? "ring-2 ring-coral-500" : "ring-1 ring-blush-400"
              }`}
              style={{ background: colorNameToHex(v) }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-1.5">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={`rounded-md border py-2.5 font-sans text-[12px] font-semibold ${
                selected === v ? "border-ink bg-ink text-white" : "border-blush-400 bg-white text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    black: "#1c1010", white: "#ffffff", coral: "#E5604A", blush: "#F2DDD8",
    cream: "#FAF6F4", nude: "#F2DDD8", pink: "#F8D5CD", red: "#B8412C",
    green: "#3a5a40", blue: "#85C1E9", yellow: "#F4D03F", grey: "#8a7773",
    gray: "#8a7773", brown: "#5e4030",
  };
  return map[name.toLowerCase()] ?? "#8a7773";
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/product/ProductBuy.tsx
git commit -m "feat(pdp): redesign buy box with stock signal, color dots, size grid"
```

---

## Task 4.5: `StickyATC` (mobile sticky bar)

**Files:**
- Create: `src/components/product/StickyATC.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice, getDisplayPrice } from "@/lib/format";

type Product = HttpTypes.StoreProduct;

/**
 * Mobile-only sticky Add-to-Bag bar that appears once the inline ATC scrolls
 * out of view. Watches an anchor element passed by id.
 *
 * Hides itself when the cart drawer is open to avoid double-stacking.
 */
export function StickyATC({
  product,
  watchElementId,
}: {
  product: Product;
  watchElementId: string;
}) {
  const [visible, setVisible] = useState(false);
  const { addItem, loading, open } = useCart();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = document.getElementById(watchElementId);
    if (!target) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, [watchElementId]);

  if (!visible || open) return null;

  const price = getDisplayPrice(product);

  const onAdd = async () => {
    const variant = product.variants?.find(
      (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
    );
    if (!variant) return;
    await addItem(variant.id, 1);
  };

  return (
    <div className="sticky bottom-[64px] z-[10] flex items-center gap-3 border-t border-blush-100 bg-white px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
      <div className="flex flex-col">
        <span className="font-sans text-[15px] font-bold leading-none text-coral-500">
          {formatPrice(price.amount, price.currency)}
        </span>
        {price.onSale && (
          <span className="mt-0.5 font-sans text-[10px] text-ink-muted line-through">
            {formatPrice(price.original, price.currency)}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={loading}
        className="flex-1 rounded-full bg-ink py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add to Bag"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/product/StickyATC.tsx
git commit -m "feat(pdp): add mobile StickyATC bar"
```

---

## Task 4.6: `ProductAccordion` (replaces `ProductTabs`)

**Files:**
- Create: `src/components/product/ProductAccordion.tsx`
- Delete: `src/components/product/ProductTabs.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";

import { useState } from "react";

type Section = { key: string; title: string; body: React.ReactNode };

export function ProductAccordion({ description }: { description?: string | null }) {
  const sections: Section[] = [
    {
      key: "desc",
      title: "Description",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">{description || "No description yet."}</p>,
    },
    {
      key: "materials",
      title: "Materials & care",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">Hand wash cold. Lay flat to dry. Do not bleach.</p>,
    },
    {
      key: "size",
      title: "Size & fit",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">True to size. Model is 5'7" wearing size S.</p>,
    },
    {
      key: "shipping",
      title: "Shipping & returns",
      body: <p className="font-sans text-[13px] leading-[1.6] text-ink-soft">Free shipping on Rs 999+. 7-day easy returns. COD available across Mauritius.</p>,
    },
  ];

  const [open, setOpen] = useState<string>("desc");

  return (
    <div className="border-t border-blush-100">
      {sections.map((s) => {
        const isOpen = open === s.key;
        return (
          <div key={s.key} className="border-b border-blush-100">
            <button
              onClick={() => setOpen(isOpen ? "" : s.key)}
              className="flex w-full items-center justify-between py-4 font-sans text-[12px] font-bold uppercase tracking-[0.1em] text-ink"
            >
              <span>{s.title}</span>
              <span className={`text-coral-500 text-[18px] transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
            </button>
            {isOpen && <div className="pb-4">{s.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Delete the old tabs**

```bash
rm src/components/product/ProductTabs.tsx
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

If `ProductTabs` is referenced from `app/products/[handle]/page.tsx`, remove that import (we'll wire the new accordion in Task 4.9).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(pdp): replace ProductTabs with ProductAccordion"
```

---

## Task 4.7: `ProductReviews` with hardcoded data

**Files:**
- Create: `src/lib/reviews.ts`
- Create: `src/components/product/ProductReviews.tsx`

- [ ] **Step 1: Hardcoded reviews data**

```ts
// src/lib/reviews.ts
export type Review = {
  initial: string;
  name: string;
  date: string; // e.g. "Mar 2026"
  stars: 1 | 2 | 3 | 4 | 5;
  quote: string;
  size?: string;
  color?: string;
  fitNote?: "True to size" | "Runs small" | "Runs large";
};

const SAMPLE: Review[] = [
  { initial: "P", name: "Priya S.", date: "Mar 2026", stars: 5, quote: "Quality blew me away — fits perfectly and arrived in 2 days. Already ordered the matching set.", size: "S", color: "Coral", fitNote: "True to size" },
  { initial: "A", name: "Anjali M.", date: "Feb 2026", stars: 5, quote: "Honestly the prettiest dress I own. Got compliments all night 💕", size: "M", color: "Black", fitNote: "True to size" },
  { initial: "M", name: "Maya R.", date: "Feb 2026", stars: 5, quote: "My go-to for everything beach. The fit is unreal — even the bottoms run true to size.", size: "S", color: "Coral", fitNote: "True to size" },
  { initial: "K", name: "Kavya L.", date: "Jan 2026", stars: 5, quote: "Wore this to a friend's wedding — got asked where I bought it three times.", size: "M", color: "Coral", fitNote: "True to size" },
];

/**
 * For v1, every product gets the same sample reviews.
 * Replace with a real Medusa-backed review system later.
 */
export function getReviewsForProduct(_handle: string) {
  return { average: 4.8, count: 48, reviews: SAMPLE };
}
```

- [ ] **Step 2: Component**

```tsx
// src/components/product/ProductReviews.tsx
import { getReviewsForProduct } from "@/lib/reviews";

export function ProductReviews({ handle }: { handle: string }) {
  const { average, count, reviews } = getReviewsForProduct(handle);

  return (
    <section id="reviews" className="bg-white py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <header className="mb-6 flex items-center gap-6">
          <div className="font-display text-[36px] leading-none text-ink md:text-[56px]">{average}</div>
          <div>
            <div className="font-sans text-[14px] tracking-widest text-coral-500 md:text-[18px]">★ ★ ★ ★ ★</div>
            <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted md:text-[11px]">
              Based on {count} verified reviews
            </p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {reviews.map((r) => (
            <article key={r.name} className="rounded-2xl bg-blush-100 p-4">
              <header className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-300 font-sans text-[12px] font-bold text-white">{r.initial}</div>
                <div>
                  <div className="font-sans text-[12px] font-bold text-ink">{r.name}</div>
                  <div className="font-sans text-[9px] font-bold uppercase tracking-wider text-emerald-700">✓ Verified · {r.date}</div>
                </div>
                <div className="ml-auto font-sans text-[11px] tracking-wider text-coral-500">{"★".repeat(r.stars)}</div>
              </header>
              <p className="mb-2 font-sans text-[13px] leading-[1.5] text-ink-soft">"{r.quote}"</p>
              {(r.size || r.color || r.fitNote) && (
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {[r.size && `Size ${r.size}`, r.color, r.fitNote].filter(Boolean).join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit
git add src/lib/reviews.ts src/components/product/ProductReviews.tsx
git commit -m "feat(pdp): add ProductReviews with hardcoded sample data"
```

---

## Task 4.8: `YouMayAlsoLike` rail

**Files:**
- Create: `src/components/product/YouMayAlsoLike.tsx`

- [ ] **Step 1: Create**

```tsx
import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";
import { ProductCard } from "@/components/ProductCard";

export function YouMayAlsoLike({ products }: { products: HttpTypes.StoreProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="py-8 md:py-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between px-4 pb-4 md:px-8">
          <h2 className="font-display text-[22px] leading-none text-ink md:text-[28px]">
            You may also <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>like</em>
          </h2>
          <Link href="/shop" className="font-sans text-[10px] font-bold uppercase tracking-wider text-coral-500 md:text-[12px]">
            See all →
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 md:hidden">
          {products.slice(0, 6).map((p) => (
            <div key={p.id} className="w-[150px] shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-5 gap-4 px-8 md:grid">
          {products.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add src/components/product/YouMayAlsoLike.tsx
git commit -m "feat(pdp): add YouMayAlsoLike rail"
```

---

## Task 4.9: Wire `/products/[handle]` page

**Files:**
- Rewrite: `src/app/products/[handle]/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat src/app/products/[handle]/page.tsx
```

Note how the current page: fetches the product, returns 404 if missing, renders gallery + buy + tabs.

- [ ] **Step 2: Replace the page**

Adapt to the existing data-fetch helper (likely `getProductByHandle`). The redesigned layout:

```tsx
import { notFound } from "next/navigation";
import { getProductByHandle, listProducts } from "@/lib/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuy } from "@/components/product/ProductBuy";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { ProductReviews } from "@/components/product/ProductReviews";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { StickyATC } from "@/components/product/StickyATC";

export const revalidate = 60;

type RouteParams = Promise<{ handle: string }>;

export default async function ProductPage({ params }: { params: RouteParams }) {
  const { handle } = await params;
  const { product } = await getProductByHandle(handle);
  if (!product) notFound();

  const related = await listProducts({ limit: 6, order: "-created_at" }).catch(() => ({ products: [], count: 0, region: null! }));

  return (
    <main>
      <nav aria-label="Breadcrumb" className="px-4 py-3 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted md:px-8 md:py-4">
        <a href="/" className="hover:text-ink">Home</a> / <a href="/shop" className="hover:text-ink">Shop</a> / <span className="text-ink">{product.title}</span>
      </nav>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-0 pb-8 md:grid-cols-[1fr_480px] md:gap-8 md:px-8 md:pb-12">
        <ProductGallery product={product} />
        <div className="px-4 md:sticky md:top-6 md:px-0" id="pdp-buy-anchor">
          <ProductBuy product={product} />
          <div className="mt-6">
            <ProductAccordion description={product.description ?? null} />
          </div>
        </div>
      </div>

      <YouMayAlsoLike products={related.products} />
      <ProductReviews handle={handle} />

      <StickyATC product={product} watchElementId="pdp-buy-anchor" />
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
npm run build
```

Expected: pass. If it fails because Next.js 16 wants a different `params` shape, check `node_modules/next/dist/docs/01-app/02-routing/02-defining-routes.md` and adjust accordingly. The `Promise<{ handle: string }>` shape above is the v16 default.

- [ ] **Step 4: Manual smoke**

`npm run dev` → `/products/<existing-handle>`:
- Mobile: peek-carousel works (next image visible on right edge), counter updates as you swipe
- Desktop: 90px thumb column, click thumb to swap main, click main to zoom
- Buy box: stock signal, color dots, size grid all render; ATC adds to cart
- Sticky ATC bar appears on mobile after scrolling past inline ATC; disappears when cart drawer opens
- Accordion expands/collapses
- "You may also like" rail renders
- Reviews block appears at the bottom

- [ ] **Step 5: Commit**

```bash
git add src/app/products/[handle]/page.tsx
git commit -m "feat(pdp): rewire product page with new gallery, buy, accordion, reviews"
```

---

# Final cleanup + verification

## Task F.1: End-to-end smoke

- [ ] **Step 1: Type-check + lint + build the whole site**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must pass.

- [ ] **Step 2: Walk the golden path**

`npm run dev`. Mobile + desktop:

1. `/` → all 9 sections in correct order. Hero tiles route to PDP. Trending and New Arrivals rails scroll horizontally on mobile, grid on desktop. View All tile in the New Arrivals rail routes to `/shop?sort=new`. Loyalty perks render. Reviews render. Newsletter form submits.
2. `/shop` → filter chips (mobile), sticky filter+sort bar (mobile), sidebar (desktop). Toggle a category, URL updates, products refresh.
3. `/products/<existing-handle>` → mobile gallery peeks the next image. Desktop has 90px thumbs. Click a thumb → main swaps. Buy box: pick color + size → "Add to Bag" → cart drawer opens, item appears. Scroll down: sticky ATC appears; tapping it adds again. Accordion sections open. "You may also like" rail loads. Reviews render.
4. Mobile bottom nav: visible on every page. Active tab matches route. Tapping Cart opens drawer.

- [ ] **Step 3: Lighthouse mobile audit (informational)**

DevTools → Lighthouse → Mobile → Generate report. Confirm CLS is low (the 3:4 aspect-ratio change should have improved this) and total page weight hasn't ballooned. No hard pass/fail; note any regression > 5 points and revisit.

- [ ] **Step 4: Commit any final tweaks**

If you needed to tweak anything during smoke testing, commit those changes now with descriptive messages.

```bash
git status
# (commit any small fixes)
```

- [ ] **Step 5: Final celebratory commit (optional)**

If the redesign is fully complete and verified, tag it:

```bash
git tag -a storefront-redesign-v1 -m "Storefront redesign: home + shop + PDP + Card B + 3:4 image fix"
```

(Tagging is optional. Skip if you'd rather wait until staging verifies cleanly.)

---

## Cross-references

- **Spec:** `docs/superpowers/specs/2026-05-03-storefront-redesign-design.md`
- **Brainstorm mockups (read-only):** `.superpowers/brainstorm/<session>/content/*.html`
- **Project conventions:** `CLAUDE.md`, `AGENTS.md` (root of `DUB-front/`)
