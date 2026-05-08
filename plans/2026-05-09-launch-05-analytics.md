# Plan 05 — Analytics & tracking

**Owner:** Frontend + Marketing
**Priority:** P0 — must ship before launch (no analytics = blind launch)
**Estimated effort:** 4–6 hours
**Repo:** `DUB-front`

## Context
Currently zero analytics installed: no GA4, no Meta Pixel, no GTM, no consent banner. Doll Up Boutique runs Meta ads — the pixel is required for retargeting and ROAS measurement. GA4 for behavior + funnel.

## Architecture decision
- **GTM as the single tag manager** — one container, GA4 + Meta Pixel + future tags configured inside GTM.
- **`@next/third-parties`** for the GTM script tag (Next.js-optimized loading).
- **Consent banner** — Mauritius has no GDPR equivalent law, but for users in EU on Instagram → website (likely), and to future-proof, ship a minimal consent banner that defaults to "denied" and unblocks tags on accept. Use Google Consent Mode v2 since GA4 requires it post-2024.
- **Server-side conversion API (CAPI)** for Meta — improves attribution by ~15-20% vs pixel-only. Defer to v2 if 36h is tight.

## Tasks

### Step 1 — Create accounts
- [ ] GA4 property: `Doll Up Boutique — Production` (currency MUR, timezone Indian/Mauritius)
- [ ] GTM container: `Doll Up Boutique — Web`
- [ ] Meta Business Manager → Pixel: `Doll Up Boutique` (pixel ID needed for backend conversion API too)
- Document IDs in `.env.example`.

### Step 2 — Install GTM via @next/third-parties
- `npm install @next/third-parties`
- File: `DUB-front/src/app/layout.tsx`
  ```tsx
  import { GoogleTagManager } from "@next/third-parties/google";

  // ... inside RootLayout:
  <html ...>
    <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID!} />
    ...
  </html>
  ```
- Add `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` to `.env.local` and Coolify.

### Step 3 — Configure GA4 inside GTM
- In GTM workspace:
  - Tag: GA4 Configuration with Measurement ID
  - Trigger: All Pages — Page View
  - Default Consent: denied for ad_storage, analytics_storage, ad_user_data, ad_personalization
- Publish container.

### Step 4 — Configure Meta Pixel inside GTM
- Tag: Custom HTML with the Meta base pixel snippet
- Trigger: All Pages — Page View
- Use the `fbq('consent', 'grant'/'revoke')` call gated on consent state.

### Step 5 — Push e-commerce events from the app
- File: `DUB-front/src/lib/analytics.ts` (new)
  ```ts
  export function pushDataLayer(event: string, payload: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ecommerce: payload });
  }
  ```
- Wire events:
  - `view_item` — fire from `src/app/products/[handle]/page.tsx` client subcomponent on mount
  - `add_to_cart` — fire from `src/components/cart/CartProvider.tsx` after `addItem()`
  - `view_cart` — fire from `src/components/cart/CartDrawer.tsx` on open
  - `begin_checkout` — fire from `src/app/checkout/CheckoutForm.tsx` on mount
  - `add_shipping_info` — after `cart.addShippingMethod`
  - `add_payment_info` — after `payment.initiatePaymentSession`
  - `purchase` — from `src/app/checkout/success/page.tsx` (must include order ID, value, items, currency MUR)
- Reference GA4 ecommerce event schema: https://developers.google.com/tag-platform/gtagjs/reference/events
- In GTM, configure GA4 Event tags + Meta Pixel tags listening on these `event:` names.

### Step 6 — Consent banner
- File: `DUB-front/src/components/ConsentBanner.tsx` (new, client component)
- Minimal banner with three buttons: Accept all / Reject all / Customize.
- Persist choice to `localStorage` and set `gtag('consent', 'update', {...})` on accept.
- Show only if no consent record exists.
- Render in `layout.tsx` after `<Footer />`.
- Reference: Google Consent Mode v2 docs.

### Step 7 — Add Meta CAPI server-side (optional, ship v2 if time-tight)
- File: `DUB-front/src/app/api/meta-capi/route.ts` (new)
- POST handler that forwards events to Meta's Conversion API using a server-side access token.
- Call from `success/page.tsx` after successful order with hashed customer email + order details.
- Improves match rate when iOS users block pixel.

### Step 8 — Document tracking plan
- File: `DUB-front/docs/analytics-tracking-plan.md` (new)
- Table of every event, where it fires, expected parameters, GTM tag config.
- For ongoing reference when adding new tags.

## Verification checklist
- [ ] `dataLayer` populated with `view_item`, `add_to_cart`, `purchase` (verify in DevTools Console)
- [ ] GTM Preview mode shows tags firing on each event
- [ ] GA4 DebugView shows events in real-time
- [ ] Meta Pixel Helper extension shows pixel + events firing
- [ ] Consent banner shows on first visit, hidden after choice
- [ ] After "Reject all", no GA / Meta requests in Network tab
- [ ] After "Accept", GA + Meta requests fire on subsequent events
- [ ] Test purchase order ID appears in GA4 within 60s
- [ ] Production build clean
- [ ] Document GTM container ID, GA4 property ID, Meta Pixel ID in 1Password

## Out of scope (post-launch)
- Server-side GA4 (Measurement Protocol) for resilience against ad-blockers
- Meta CAPI if not done in Step 7
- Event-quality monitoring dashboard
- Custom audience definitions in Meta Ads Manager (Marketing task)
