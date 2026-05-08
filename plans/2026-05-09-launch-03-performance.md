# Plan 03 — Performance optimizations

**Owner:** Frontend
**Priority:** P1 — measurable LCP/TTFB improvement, ships before launch
**Estimated effort:** 3–4 hours
**Repo:** `DUB-front`

## Context
Already shipped inline (2026-05-09):
- ✅ Removed `ProductGallery` JS hydration gate (`src/components/product/ProductGallery.tsx`)
- ✅ Added `<link rel="preconnect">` to `api.dollupboutique.com` and `cdn.dollupboutique.com` in `layout.tsx`
- ✅ Deleted `/home-v2` duplicate route

Remaining optimizations follow.

## Tasks

### Step 1 — Move `sanitize-html` to server component
- File: `DUB-front/src/components/product/ProductAccordion.tsx`
- Currently: `"use client"` + imports `sanitize-html` (~50KB gzip on every PDP)
- Change: PDP page (`src/app/products/[handle]/page.tsx`) calls `sanitizeRichText(product.description)` server-side and passes the cleaned string as a prop. `ProductAccordion` keeps its client interactivity (open/close) but receives pre-sanitized HTML.
- Verify by inspecting `.next/static/chunks/*` after build — `sanitize-html` should not appear in the PDP route bundle.

### Step 2 — Lazy-load `Lightbox` via `next/dynamic`
- Files: `ProductGalleryDesktop.tsx`, `ProductGalleryMobile.tsx`
- Replace top-level import with:
  ```tsx
  const Lightbox = dynamic(() => import("./Lightbox").then((m) => m.Lightbox), {
    ssr: false,
    loading: () => null,
  });
  ```
- Lightbox only renders when `lightboxOpen === true`, so first-paint bundle drops.

### Step 3 — Lazy-load `CartDrawer`
- File: `DUB-front/src/components/cart/CartProvider.tsx:18`
- Currently: `CartDrawer` is statically imported and embedded in `CartProvider` which wraps the whole layout.
- Refactor: only mount `CartDrawer` when `open === true` (state already in provider). Use `next/dynamic` with `ssr: false`.
- `focus-trap-react` should drop out of every-page bundle.

### Step 4 — Split `Header` into smaller client islands
- File: `DUB-front/src/components/Header.tsx`
- Currently: entire header (~15 KB source) is `"use client"` because of search/menu/account interactivity.
- Refactor:
  - Make `Header.tsx` a server component with logo + static nav links.
  - Extract `<HeaderSearch>`, `<HeaderAccountMenu>`, `<HeaderMobileNav>` as client islands.
  - JSON-LD and skip-to-content stay server-rendered.
- Goal: drop the Header bundle from every route.

### Step 5 — Optimize `/shop` facets fetch
- File: `DUB-front/src/app/shop/page.tsx:108-132`
- Currently: every visit fires up to **12-24 backend round-trips** (1200-product loop × 2 for facets + filters).
- Two-tier fix:
  - **Quick win (this plan):** Cache facets in module-scope on the Next.js server with `unstable_cache` and `revalidateTag('shop-facets')` — refresh nightly via cron from Medusa.
  - **Real fix (future):** Push facet computation to a Medusa custom endpoint that pre-aggregates from indexed product data.

### Step 6 — Recompress oversized lookbook image
- File: `DUB-front/public/lookbook/08-stacy-woo.webp`
- Currently 699 KB. Sibling images are 70–200 KB.
- Run: `npx sharp-cli --input 08-stacy-woo.webp --output 08-stacy-woo.webp --webp-quality 75 --resize 1200`
- Or re-run the existing `scripts/optimize-lookbook.mjs` on this single file.
- Target size: <150 KB.

### Step 7 — Replace logo PNG with SVG
- File: `DUB-front/public/logo.png` (73 KB) → `DUB-front/public/logo.svg` (~2 KB)
- Generate SVG from the existing logo. Update `Header.tsx` reference.
- SVG is also crisper at all DPRs.

### Step 8 — Drop unused DM Sans weight
- File: `DUB-front/src/app/layout.tsx:18-23`
- Currently loads weights `300/400/500/600`.
- Audit usage: `grep -r "font-light\|font-300" src/` — if 300 is unused, drop it. Same for any other unused weight.

### Step 9 — Move `HeroBento` inline keyframes to globals.css
- File: `DUB-front/src/components/home/HeroBento.tsx:158-170`
- Move inline `<style>{...}</style>` block to `src/app/globals.css`.
- Avoids repeated style-injection on every render.

## Verification checklist
- [ ] `npm run build` shows reduced shared chunk size
- [ ] PDP route bundle no longer contains `sanitize-html`, `focus-trap-react`, or `Lightbox` code
- [ ] Pagespeed Insights mobile score improves by ≥ 10 points (run before/after)
- [ ] LCP on PDP < 2.5s on simulated mobile 4G
- [ ] No visual regressions on home, shop, PDP, checkout, account pages
- [ ] All existing functionality still works (cart, wishlist, lightbox)

## Out of scope (Plan 06 / future)
- Backend Redis cache for Medusa queries
- Edge caching via Cloudflare Workers
- Image CDN switch from Medusa S3 to a dedicated image service
