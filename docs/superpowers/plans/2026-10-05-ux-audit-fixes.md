# UX audit fixes — 2026-10-05

Source: live-site UI/UX audit of `origin/master` (76b7c33) on 2026-10-04.
Branch: `fix/ux-audit` from `origin/master` (local master is diverged; never
ship storefront fixes from it).

Verification per batch: `npx tsc --noEmit`, `npm test`, `next build` route
table, then a dev-server smoke on the touched pages at 390px and 1440px.

## Batch 1 — colour tokens (contrast)
- `coral-500` #E5604A → #C64A36 (4.74:1 on white, 4.5 on cream). Every
  button, badge, promo bar and small coral text passes AA by token change.
- `coral-700` #B84A38 → #A8412F so hover is still visibly darker.
- New `coral-450` = #E5604A kept for large display accents only (hero
  "babe.", "Collection" italics, section-title accents, decorative blobs).

## Batch 2 — product card
- Title 14px, price 16px semibold, badges 11px, colour overflow 10px,
  strike price 12px. Keep card height stable.
- Action overlay: desktop reveal on hover/focus-within; mobile compact pill.
- "Select size" opens an inline size sheet (bottom sheet, focus-trapped)
  that adds the chosen variant; no more silent navigation to the PDP.

## Batch 3 — header / nav
- Header hides on scroll-down, returns on scroll-up (mobile + desktop).
- Cart buttons: `aria-label="Cart, N items"`; badge + drawer both count units.
- HOT badge: screen-reader separator so it is not "After DarkHot".
- Bottom nav labels 11px.

## Batch 4 — /shop
- Drop the duplicate "Filters" chip; sticky bar is the single entry point.
- Sticky Filters/Sort bar hides once the grid has scrolled out of view.
- Pagination → "Load more" (cumulative `?page=N`, `scroll={false}`) with
  "Showing X of Y". Keep `page` in the URL for back/forward + SEO canonical.
- Remove the no-op "Popular" sort. Default `/shop` (no filters) lists
  After Dark items last instead of first.
- Replace ⚙ ▾ ▴ → glyphs with lucide icons in the shop chrome.

## Batch 5 — PDP (mobile)
- Size pills 44px. All sizes rendered; sold-out ones disabled + struck with a
  "Notify me" WhatsApp link (no backend endpoint exists for restock alerts).
- Title scrim (gradient) + price next to the title on the hero.
- Accordion headings 14px, "See all" 12px with a 44px hit area.

## Batch 6 — cart / checkout
- `CartProvider.ready`: true once the stored cart has been retrieved (or
  there is none). Checkout shows a skeleton until then, never a false
  "Your bag is empty".
- Drawer hides "Default variant"; line text 12–13px.

## Batch 7 — footer / home / misc
- Footer groups collapse into accordions below `md`; 44px link rows; legal
  row 12px; Subscribe button 44px.
- Essentials rail: one responsive grid instead of two DOM copies.
- Guest sessions skip `/store/customers/me` unless a session marker exists.

Out of scope (owner/content): supplier photos with baked-in prices, promo
bar copy (restored by hand on 17/10), "Popular" backed by real order data.
