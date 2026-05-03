# Storefront Redesign — Design Spec

**Date:** 2026-05-03
**Status:** Draft (pending user review)
**Author:** Rahvi (with Claude)
**Scope:** `/` (home), `/shop`, `/products/[handle]`

## Goal

Pull the storefront forward in two coordinated steps:

1. **Boutique brand identity stays.** Coral / blush palette, Playfair Display + DM Sans, soft femme personality. We are not adopting Shein's or Temu's visual aesthetic.
2. **Shein-grade UX patterns layered on top.** Persistent search, mobile bottom nav, sticky cart, filter chips, quick-add, horizontal product rails, urgency badges. Mauritius shoppers already know these patterns from the apps they use daily; matching them lowers friction.

The result is a boutique that looks like Doll Up and *behaves* like Princess Polly / Cider / Reformation. Mobile-first, with desktop refinements.

The redesign also fixes the long-standing image-sizing issue: every product/lifestyle image now uses `aspect-ratio: 3/4` portrait with `object-position: center top` — replacing today's fixed pixel heights, which crop dresses awkwardly.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Direction | Boutique brand + Shein UX patterns (Path 2). NOT a Shein aesthetic clone. |
| Photography reality | Limited lifestyle, mostly product shots. Sections are designed around this. |
| Hero treatment | Bento mosaic — 5 portrait tiles, varied sizes, synchronized float animation, no overlays / badges / prices, click → PDP |
| Hero data source | Products tagged "Featured" in Medusa (top 5 by `created_at` if untagged) |
| Hero animation | Synchronized float (CSS keyframes, staggered delays, `prefers-reduced-motion: no-preference` only) |
| Home section order | Hero → Trending → Categories → Sales of the Month → New Arrivals → Doll Rewards → Reviews → Babe Essentials → Newsletter |
| Product card | Card B revised: 3:4 image, NEW + discount badge stack TL, heart TR, persistent Quick Add, name (2-line), coral discount price + strikethrough, color dots. **No stars on cards.** Stars live on PDP. |
| Card grid | 2 cols mobile / 4 cols desktop in shop. 130px wide in horizontal rails. |
| Image aspect | `3/4` portrait with `object-position: center top` everywhere. Replaces all fixed pixel heights. |
| Pastel card backgrounds | Removed. Image fills the tile. |
| Mobile gallery | "Peek next image" — full-width swipe carousel where ~10% of the next photo is always visible on the right edge + dots + counter |
| Desktop gallery | Vertical thumbs at **90px wide** (was 72px) + sticky main image with click-to-zoom |
| Mobile bottom nav | New global component: Home / Shop / Wishlist / Cart / Me — sticky, only on mobile |
| Persistent search | Always-visible search bar (mobile under header, desktop centered in header). Replaces today's behind-a-click search. |
| Reviews on cards | Removed. Reviews summary lives only on PDP. |
| Sticky ATC bar | Mobile only, on `/products/[handle]`, appears after user scrolls past inline ATC. |
| Filter UX | Mobile = horizontal chip strip + sticky bottom bar (Filters + Sort). Desktop = sidebar. |
| New page sections | Sales of the Month banner with countdown; Babe Essentials bento (boob tape, nipple covers, strapless bra, body shaper). |
| Out-of-scope pages | `/contact`, `/about`, `/lookbook`, `/loyalty`, `/wishlist`, `/account`, `/faq`, `/size-guide` — still 404 after this work. Tracked separately. |

## User flows

### Home page top-to-bottom

1. **Hero** — bento mosaic with synchronized float. Each tile is a `Link` to a Featured product's PDP. Mobile keeps the 3-tile strip with badges/prices (mobile shoppers want quick decisions); desktop uses the 5-tile float bento (browsing energy).
2. **Trending rail** — horizontal-scroll on mobile, 5-card grid on desktop. Card B. Fed by `products` ordered by recency × interaction (placeholder: most recently created in the "trending" tag, fall back to `created_at desc`).
3. **Round category icons** — 6 round tiles: All New, Dresses, Lingerie, Beachwear, Tops, Sale. Each links to the relevant `/shop?category=…` filter. "All New" tile uses a coral gradient with a star; the others use a representative product photo.
4. **Sales of the Month** — dark band + coral gradient. Headline + giant "up to N%" + countdown timer ticking to the configured end date. CTA to `/shop?sort=sale`. If no sale is configured, the entire section hides.
5. **New Arrivals rail** — same Card B rail as Trending, but the **last "card" in the rail is the View All tile** (coral gradient, big arrow, "{n} new pieces"). Replaces a separate "See all →" header link. Fed by `products?order=-created_at&limit=10`.
6. **Doll Rewards** — 3 perk cards (icon + line of copy each): points, early access, birthday + free shipping. CTA "Join Doll Rewards" + "1,200+ members" social-proof microcopy. Section is currently linked to `/loyalty` which 404s — update href to `/loyalty` but treat the page itself as out of scope.
7. **Reviews** — verified-buyer cards with avatar (initial), star rating, review text, and the actual product card linking to the PDP. Mobile: 2 cards. Desktop: 3 cards. Currently uses hardcoded review data (no reviews data model in Medusa yet).
8. **Babe Essentials bento** — 3 mobile / 4 desktop tiles. Each tile shows a product photo with name + price overlaid on a bottom-aligned gradient. Each tile is a clickable PDP link. Sourced from a Medusa collection or tag named `essentials` (boob tape, nipple covers, strapless bra, body shaper).
9. **Newsletter band** — coral band with single-row pill form. Uses existing `NewsletterForm.tsx` (refactored visually).

### Shop page

1. Header with persistent search.
2. Page head: breadcrumb + italic H1 ("Dresses *collection*") + count.
3. Mobile: filter chip strip (Filters icon w/ count, active facets, Sort). Sticky bottom bar (Filters + Sort buttons). Tap Filters → sheet overlay with full filter set.
4. Desktop: 230px sidebar (Category checkboxes, Size grid, Color swatches, Price slider, Style). Sticky as user scrolls.
5. Product grid using Card B. 2 cols mobile, 4 cols desktop.
6. Pagination at bottom + "Load 16 more" button on mobile (gives both options).

### Product detail page

1. Header.
2. **Mobile gallery**: full-width swipe carousel where the next image's ~10% is always visible on the right edge. Dots + counter ("1 / 5") overlay at the bottom. Heart top-right. Tap → fullscreen zoom (later iteration; v1 = no zoom modal, just inline carousel).
3. **Desktop gallery**: 90px-wide vertical thumb column on the left. Each thumb is a 3:4 portrait, click → swap main. Active thumb has a coral border. Main image is 3:4 with click-to-zoom (lightbox; v1 may use simple `cursor: zoom-in` and `transform: scale` on hover, lightbox modal can come later).
4. **Buy box** (sticky on desktop): italic title, stars + count link (anchors to reviews), big coral price + strikethrough + "Save N%" badge, stock signal ("● In stock", "⚠ Only N left in {size}"), color dots, size grid (XS-XXL with active / available / disabled states), Add to Bag + heart, trust strip (free shipping / 7-day returns / COD), accordion (Description / Materials & care / Size & fit / Shipping & returns).
5. **Sticky ATC bar** (mobile only) — appears after the user scrolls past the inline ATC, sits above the bottom nav. Shows price + Add to Bag button.
6. "You may also like" rail using Card B.
7. Reviews block — verified-buyer cards with size/fit info. Mobile: 2 cards + "Read all N reviews" link. Desktop: 4 cards in a 2-col grid.
8. Mobile bottom nav.

## Architecture

### File layout (changes)

```
src/app/
  layout.tsx                       # add MobileBottomNav (mobile-only sticky)
  page.tsx                         # rewire home sections in new order

src/components/
  Header.tsx                       # add persistent SearchBar; reposition icons
  MobileBottomNav.tsx              # NEW: sticky bottom nav (Home/Shop/Wishlist/Cart/Me)
  ProductCard.tsx                  # rewrite to Card B (3:4, badge stack, quick add, color dots)

  home/
    HeroBento.tsx                  # NEW: replaces HeroA — 5-tile bento mosaic w/ float
    TrendingRail.tsx               # NEW: horizontal-scroll rail
    CategoryIcons.tsx              # rewrite of CategoryStrip — round icons
    SalesOfTheMonth.tsx            # NEW: replaces EditorialBanner
    NewArrivalsRail.tsx            # NEW: rail w/ inline ViewAll tile
    LoyaltyTeaser.tsx              # rewrite — perk cards
    Testimonials.tsx               # rewrite — verified-buyer cards
    BabeEssentials.tsx             # NEW: bento grid
  # NewArrivals.tsx                # DELETE: replaced by NewArrivalsRail
  # EditorialBanner.tsx            # DELETE: replaced by SalesOfTheMonth

  shop/
    ShopFilters.tsx                # split into ShopFilterChips (mobile) + ShopFilterSidebar (desktop)
    ShopFilterSheet.tsx            # NEW: mobile bottom sheet for filters
    ShopStickyBar.tsx              # NEW: mobile sticky bottom bar
    ShopSortDropdown.tsx           # NEW: sort component (used both)

  product/
    ProductGalleryMobile.tsx       # NEW: peek-carousel
    ProductGalleryDesktop.tsx      # NEW: 90px vertical thumbs + main
    ProductGallery.tsx             # becomes a router that picks Mobile vs Desktop via media query
    ProductBuy.tsx                 # add stock signal, urgency, redesigned price/cta
    StickyATC.tsx                  # NEW: mobile-only sticky ATC bar
    ProductTabs.tsx                # convert to accordion style; rename → ProductAccordion.tsx
    YouMayAlsoLike.tsx             # NEW: rail wrapper around Card B
    ProductReviews.tsx             # NEW: verified-buyer review cards (hardcoded data v1)

src/lib/
  medusa.ts                        # add helpers for "Featured", "Trending", "Essentials" lists
  format.ts                        # add formatDiscountPercent helper
  hooks/useMedia.ts                # NEW: simple useMediaQuery for client gallery routing

src/app/products/[handle]/page.tsx  # wire ProductGallery + ProductBuy + StickyATC + Reviews + YouMayAlsoLike
```

### Data sources (Medusa)

| Section | Source | Fallback |
|---|---|---|
| Hero bento | Products tagged `featured` (limit 5) | Top 5 by `created_at` |
| Trending rail | Products tagged `trending` (limit 10) | `?order=-created_at&limit=10` |
| New Arrivals rail | `?order=-created_at&limit=10` | n/a |
| Categories | Hardcoded list mapping to `/shop?category={slug}` | n/a |
| Sales of the Month | Reads from a `salesOfMonth` config (env or hardcoded) — `{ enabled, headline, percentOff, endsAt, ctaUrl }`. If `enabled === false`, section hides. | Section hides |
| Babe Essentials | Products in collection `essentials` (limit 4) | Section shows placeholder text "Coming soon" |
| Reviews on PDP | Hardcoded for v1 (no Medusa reviews model yet) | n/a |
| Color dots | `variant.options` where `option.title === "color"` (existing Medusa model) | Empty if no color options |

### Component contracts

**`<ProductCard product={Product} />`** — Card B
- Required props: `product: HttpTypes.StoreProduct`
- Renders: 3:4 image, badge stack (NEW if `created_at` < 30 days, discount badge `-{percent}%` if `original_price > price`, "{n} left" if `0 < inventory_quantity < 5`), heart wishlist (visual only v1), persistent Quick Add pill, name (2-line clamp), coral discount price + strikethrough, color dots (max 4 + "+N more" indicator).
- **Quick Add behavior (v1):** if the product has exactly one variant, clicking adds it to cart and opens the drawer. If multi-variant, the pill renders as a `<Link>` to the PDP instead of a button (so users still get the "select size" experience). Documented in Risks for revisit.
- Used by: TrendingRail, NewArrivalsRail, YouMayAlsoLike, Shop grid.

**`<HeroBento featuredProducts={Product[]} />`**
- Required: 5 products. If fewer than 5, fall back to top 5 by `created_at desc`.
- Renders: 5-tile portrait bento — 1 feature tile (left, `aspect-ratio: 2/3.2`) + 2-column stack of 4 smaller tiles (right, `aspect-ratio: 3/4` each). Each tile is a `Link` to PDP. No badges, no prices, no overlays.
- **Animation:** synchronized float — each tile animates `translateY` over a 6s ease-in-out cycle, staggered by 0.5s between tiles. Float distances vary slightly (-6 / -8 / -12px) so movement feels organic rather than mechanical. `will-change: transform` for GPU offload. Wrapped in `@media (prefers-reduced-motion: no-preference)` — animation is OFF by default for users with reduced-motion enabled.

**`<MobileBottomNav />`**
- Renders: sticky 5-tab nav (Home / Shop / Wishlist / Cart / Me), active state matches `usePathname()`. Hidden on `md:` breakpoint.

**`<ProductGallery images={Image[]} />`** — top-level router
- Uses `useMediaQuery` to render `ProductGalleryMobile` or `ProductGalleryDesktop`. Reactive on resize.

**`<StickyATC product={Product} selectedVariant={Variant} />`**
- Renders nothing until the inline ATC is scrolled out of view (uses `IntersectionObserver` against an anchor in `ProductBuy`). When visible, sticky bar above the bottom nav.

## Image-sizing fix (the original concern)

Single source of truth: every fashion image is portrait 3:4.

| Surface | Before | After |
|---|---|---|
| `ProductCard` image | Fixed 340px mobile / 380px desktop, `object-cover` | `aspect-ratio: 3/4`, `object-cover`, `object-position: center top` |
| `ProductGallery` main (desktop) | Fixed 540px | `aspect-ratio: 3/4` |
| `ProductGallery` thumbs | 88×72px (landscape) | 90px wide, `aspect-ratio: 3/4` (portrait) |
| `ProductGallery` mobile | n/a (single image) | Full-width swipe carousel, each slide `aspect-ratio: 3/4` |
| Hero tiles | n/a (different layout entirely) | Each tile `aspect-ratio: 3/4` (large feature: `2/3.2`) |
| Bento essentials tiles | n/a | Mobile: fixed pixel heights for layout; desktop: ratio-derived |

`object-position: center top` everywhere. If a photo gets cropped, faces stay in frame; only feet / lower-body / background get sacrificed.

`next/image` `sizes` attribute updates:
- Card in shop grid: `sizes="(max-width: 768px) 50vw, 25vw"` (kept)
- Card in horizontal rail: `sizes="(max-width: 768px) 130px, 240px"`
- Gallery main desktop: `sizes="(max-width: 768px) 100vw, 50vw"`
- Gallery thumbs: `sizes="90px"` (was 72px)
- Hero feature tile: `sizes="(max-width: 768px) 60vw, 30vw"`
- Hero stacked tiles: `sizes="(max-width: 768px) 30vw, 12vw"`

Pastel `PLACEHOLDER_BGS` array in `ProductCard.tsx` is removed — the image fills the tile, and the tile background only shows during loading (use `bg-blush-100`).

## Out of scope

- Building any of: `/contact`, `/about`, `/lookbook`, `/loyalty`, `/wishlist`, `/account`, `/faq`, `/size-guide`. They remain 404. Footer / nav links stay so the future work is unblocked.
- Real reviews data model in Medusa. PDP reviews are hardcoded in v1.
- Real wishlist persistence. Heart icon is visual-only in v1.
- Image zoom modal on PDP. Click-to-zoom is a deferred enhancement — desktop main has `cursor: zoom-in` only.
- Search autosuggest. The persistent search bar still routes through `/shop?q=…`.
- "Recently viewed" rail. Dropped to keep page length manageable.
- Real countdown logic for "Sales of the Month" — uses a `salesOfMonth` config object (env or constants file) with an `endsAt` ISO timestamp. Real admin UI for sale config is out of scope.
- Header-level mega-menu / category drawer. Mobile menu stays the existing simple list.

## Verification plan

No test runner in this repo. Verification per `CLAUDE.md`:

1. `npx tsc --noEmit` passes.
2. `npm run lint` passes.
3. `npm run build` passes (incl. all new components).
4. Manual smoke at `localhost:3000`:
   - **Home**: every section renders top-to-bottom in the agreed order. Hero tiles route to a PDP. Quick Add on a rail card adds to cart and opens the drawer. Category icons route to filtered `/shop`. Sales section ticks down a fake countdown. Essentials tiles route to PDP. Newsletter form submits.
   - **Shop**: filter chips toggle facets (mobile). Sidebar filters work (desktop). Card grid renders at 2/4 cols. "Load more" appends.
   - **PDP**: mobile carousel peeks the next image. Desktop thumbs are bigger and clickable. Sticky ATC appears after scroll past inline ATC on mobile. Stock signal updates from variant. ATC adds to cart.
   - **Mobile bottom nav** is visible on mobile, hidden on desktop, active state matches the route.
5. Lighthouse mobile score doesn't regress meaningfully (< 5 points). Layout shift (CLS) should improve since fixed pixel heights are gone.
6. `prefers-reduced-motion` test: enable in OS, hero float animation stops.

## Risks

- **Hero float performance on low-end mobile** — CSS-only animation, but 5 simultaneous transforms could stutter on older Android. Mitigation: throttle to `translateY` only (no scale), `will-change: transform` on tiles, limit to desktop if mobile testing reveals jank.
- **Quick Add UX with multi-variant products** — silently picking the first available variant surprises customers expecting size choice. Mitigation v1 (matches the component contract above): on single-variant products Quick Add is a button that adds to cart and opens the drawer; on multi-variant products Quick Add becomes a `<Link>` to the PDP so users still get the size selector. Revisit later with a quick-variant popover.
- **Mobile bottom nav vs cart drawer** — both are bottom-anchored on mobile. Drawer overlays should `z-index` above the bottom nav (`z-200` vs `z-100` on the nav).
- **Sticky ATC bar interaction with cart drawer** — when the drawer opens, the sticky ATC must hide (it would peek through). Mitigation: hide when the cart drawer's `open` state is true.
- **CORS regressions** — the persistent search and quick-add still go through the existing `cart-client.ts` which is browser-side. `STORE_CORS` already covers localhost + staging; no change needed unless we add new origins.
- **Sales of the Month with no configured sale** — section must hide silently. Build a default config with `enabled: false` to ship safely.

## Open questions

1. Where does the `salesOfMonth` config live? Options: (a) env vars (`NEXT_PUBLIC_SALE_*`), (b) a TS module `src/lib/sales-of-month.ts` you edit and redeploy, (c) Medusa metadata on a `sale` campaign (heavier, deferred). **Recommendation: (b) — simplest, controllable in 1 commit.**
2. How are "Featured" and "Trending" tagged in Medusa today? If tags don't exist, v1 falls back to `created_at desc`. Worth confirming with a quick admin check before implementation.
3. The Babe Essentials section assumes a Medusa collection / tag exists for those 4 products. If not, v1 hardcodes 4 product handles and resolves them at request time.
