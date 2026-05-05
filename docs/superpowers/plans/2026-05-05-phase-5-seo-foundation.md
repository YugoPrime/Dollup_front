# Phase 5 — SEO Foundation

**Date:** 2026-05-05
**Lane:** Frontend (`DUB-front/`)
**Priority:** P1 — deploy now, dormant until domain move (noindex stays ON)
**Estimate:** ~1 hr
**Depends on:** None
**Parallel-safe with:** Phase 6.5, Phase 6 (different repo). MUST coordinate with Phase 4.7 within DUB-front — see file-ownership boundary below.

## Goal
Wire all SEO scaffolding (metadata, OG, Twitter, sitemap, JSON-LD, branded 404) so the day noindex flips off, the site is fully indexable.

## Files this phase OWNS
- `src/app/layout.tsx` (EDIT — metadata, JSON-LD Organization + WebSite)
- `src/app/sitemap.ts` (NEW)
- `src/app/robots.ts` (CONFIRM — keep noindex global until domain move)
- `src/app/not-found.tsx` (NEW or EDIT — branded)
- `src/app/page.tsx` (EDIT — `generateMetadata`)
- `src/app/products/[handle]/page.tsx` — ONLY `generateMetadata` export + Product JSON-LD component (NOT `<Image>` JSX)
- `src/app/shop/page.tsx` (EDIT — metadata + canonical)
- `src/app/about/page.tsx` (EDIT — metadata)
- All gated routes: per-route metadata export with `robots: { index: false }`:
  - `/account/**`, `/checkout/**`, `/wishlist`, `/login`, `/register`, `/track-order`, `/forgot-password`, `/reset-password`
- `public/og-default.jpg` (NEW — 1200×630 branded fallback)

## Files this phase MUST NOT TOUCH (Phase 4.7 territory)
- Hero `<Image>` JSX in `src/components/Hero*.tsx`
- PDP main `<Image>` JSX in `src/app/products/[handle]/page.tsx`
- `src/lib/blur-data.ts`
- `scripts/generate-blur.ts`

## Steps
1. `npx ctx7@latest library "Next.js" "metadata API generateMetadata sitemap JSON-LD App Router"`
2. Add `metadataBase: new URL("https://dollupboutique.com")` to root layout (production URL — primes domain migration even though staging is `shop.`)
3. Set default OG: title template `"%s — Doll Up Boutique"`, description, `og:image: /og-default.jpg`, `og:locale: en_MU`
4. Inject Organization JSON-LD in layout: name, url, logo, sameAs (FB/IG/TikTok), address (Mauritius)
5. Inject WebSite JSON-LD with SearchAction → `/shop?q={search_term_string}`
6. Create `sitemap.ts`:
   - Static pages: `/`, `/shop`, `/about`, `/contact`, `/faq`, `/shipping`, `/returns`, `/terms`, `/privacy`, `/loyalty`, `/size-guide`, `/lookbook`
   - Products: fetch via Medusa SDK
   - Categories: fetch via Medusa SDK
7. Confirm `robots.ts` blocks ALL until domain move (per user direction)
8. PDP `generateMetadata`: title=product.title, description trimmed, og:image=first product image, canonical
9. PDP Product JSON-LD: name, image, description, sku, offers (price, currency MUR, availability)
10. BreadcrumbList JSON-LD on `/shop` and PDP
11. Per-gated-route metadata: export `metadata = { robots: { index: false, follow: false } }`
12. Branded `not-found.tsx` with link back to `/shop`
13. Generate `/public/og-default.jpg` (canvas 1200×630 with logo + tagline, OR reuse existing brand asset)
14. `npm run build` clean — no `metadataBase` warnings

## Acceptance
- View source on every public page shows OG + Twitter + canonical
- `/sitemap.xml` resolves with all products + categories + static pages
- JSON-LD validates in Google Rich Results Test
- Gated routes carry `noindex`
- 404 page branded
- Build clean

## Out of scope
- Removing global noindex (Phase 7 — domain move)
- Submitting sitemap to GSC / Bing (Phase 7)
- Variant-level structured data (defer)

## Handoff notes
- `metadataBase` = `dollupboutique.com` (NOT `shop.`) — primes the migration
- Mauritius region only — no `hreflang` needed
- Currency `MUR` in Product JSON-LD offers
- Coordinate with Phase 4.7 if both touching `products/[handle]/page.tsx` — different sections, no real conflict
