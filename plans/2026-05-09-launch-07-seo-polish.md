# Plan 07 — SEO polish

**Owner:** Frontend
**Priority:** P2 — ships post-launch within first week
**Estimated effort:** 2–3 hours
**Repo:** `DUB-front`

## Context
Already shipped inline (2026-05-09):
- ✅ Deleted `/home-v2` duplicate route
- ✅ Set `<html lang="en-MU">` in layout

Remaining items improve indexing quality and rich-result eligibility.

## Tasks

### Step 1 — Improve Product JSON-LD with AggregateOffer
- File: `DUB-front/src/app/products/[handle]/page.tsx:132-164`
- Currently emits a single `Offer` even for multi-variant products with price ranges.
- Compute min/max price across variants:
  ```ts
  const prices = (product.variants ?? [])
    .map((v) => getDisplayPrice({ variants: [v] }).amount)
    .filter((p): p is number => typeof p === "number");
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  offers: lowPrice === highPrice
    ? { "@type": "Offer", url, priceCurrency: "MUR", price: lowPrice, availability, itemCondition: "https://schema.org/NewCondition" }
    : { "@type": "AggregateOffer", url, priceCurrency: "MUR", lowPrice, highPrice, offerCount: prices.length, availability, itemCondition: "https://schema.org/NewCondition" }
  ```
- Replace `sku: product.handle` with the variant SKU in the single-variant case; remove at product level for multi-variant.
- Add `priceValidUntil: <30 days from now ISO>` for richer rich-results eligibility.

### Step 2 — Add ItemList JSON-LD to /shop
- File: `DUB-front/src/app/shop/page.tsx`
- Emit ItemList for currently-visible products (page-aware).
- Helps Google understand the listing.

### Step 3 — Improve canonical for paginated /shop
- File: `DUB-front/src/app/shop/page.tsx:221-229`
- Currently: all `?page=N` canonicalize to page 1 — risk of deep products not getting indexed.
- Fix: self-referential canonical for paginated views.
  ```ts
  const canonical = page > 1 ? `/shop?page=${page}` : "/shop";
  // include `category` in canonical when set
  ```
- Add `<link rel="prev">` and `<link rel="next">` (deprecated by Google but still valid HTML hint).

### Step 4 — Add `/events` and `/events/mystery-box` to sitemap
- File: `DUB-front/src/app/sitemap.ts:6-19`
- Add the two routes to STATIC_PATHS.
- Verify they're meant to be public (per build output, both are static — yes).

### Step 5 — Add preconnect, dns-prefetch hints
- ✅ Already added in inline fixes (api + cdn). Add Google Fonts pre-connects only if `next/font` doesn't auto-handle (it does, skip).

### Step 6 — Implement CSP report endpoint
- File: `DUB-front/src/app/api/csp-report/route.ts` (new)
- Accept POST, log body to console (Coolify logs capture). Return 204.
- Lets you actually see CSP violations during the report-only window.

### Step 7 — Organization JSON-LD enrichments
- File: `DUB-front/src/app/layout.tsx:63-79`
- Add `contactPoint`:
  ```ts
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@dollupboutique.com",  // verify
    availableLanguage: ["en", "fr"],
  }
  ```
- Add `currenciesAccepted: "MUR"`.

### Step 8 — Social meta polish
- File: `DUB-front/src/app/layout.tsx`
- Generate per-route OG images via `opengraph-image.tsx` for at least:
  - `/` (homepage)
  - `/shop` (collection card)
  - `/lookbook`
- Use the Next.js `ImageResponse` API to render dynamically.

### Step 9 — Add 404 + 500 page polish
- File: `DUB-front/src/app/not-found.tsx` (verify exists)
- Should match brand, link back to home/shop, include a search box.
- Same for `error.tsx`.

## Verification checklist
- [ ] Google Rich Results Test passes on a sample PDP with multi-variant product
- [ ] Sitemap includes all public routes
- [ ] Canonicals are self-referential on paginated /shop
- [ ] CSP report endpoint returns 204 to a test POST
- [ ] OG image renders correctly when scraped via Facebook Sharing Debugger for /, /shop, sample PDP
- [ ] No 404s in the first week's GSC Coverage report
- [ ] Production build clean

## Out of scope (future)
- Multi-language hreflang (currently single locale en-MU)
- Programmatic SEO category × occasion landing pages
- Backlink outreach campaign (Marketing task)
