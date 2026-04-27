@AGENTS.md

# DUB-front — Doll Up Boutique storefront

Custom Next.js 16 storefront for a Mauritius women's fashion e-commerce store, talking to a Medusa v2 backend. Solo project, no CI, no test runner — verification is `tsc --noEmit`, `next build`, and manual browser smoke.

## Stack
- Next.js 16.2.4 (App Router, RSC, Turbopack), React 19.2.4
- Tailwind v4 with `@theme` tokens — `coral-{300,500,700}`, `blush-{100,300,400}`, `cream`, `ink/ink-soft/ink-muted`. Fonts: Playfair (`font-display`), DM Sans (`font-sans`)
- TypeScript 5
- Medusa SDK: `@medusajs/js-sdk@2.14.1`

## Repo & deploy
- GitHub: `YugoPrime/Dollup_front` (`master` only)
- Staging domain: `shop.dollupboutique.com`, auto-deployed via Coolify on push to `master`
- No production domain wired yet — staging is the live target

## Env vars
Set in Coolify and `.env.local` (gitignored). Pull values from `.env.local` when migrating machines.
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (e.g. `https://api.dollupboutique.com`)
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_DEFAULT_REGION` = `mu`

## CORS gotcha (recurring blocker)
Any browser-side Medusa call (cart add, region.list, checkout) requires the calling origin in the backend's `STORE_CORS`. If the cart drawer or checkout shows "Failed to fetch", this is the first place to look.

```
STORE_CORS=http://localhost:3000,https://shop.dollupboutique.com,https://dollupboutique.com
```

Server-rendered pages (`/shop`, `/products/[handle]`) bypass CORS because they call Medusa from Next.js, not the browser.

## Project map
```
src/app/
  layout.tsx              # CartProvider wraps everything
  page.tsx                # Home (HeroA, CategoryStrip, NewArrivals, EditorialBanner, LoyaltyTeaser, Testimonials)
  shop/page.tsx           # /shop with category, sort, pagination, search
  products/[handle]/      # PDP (gallery, buy box, tabs)
  checkout/
    page.tsx              # /checkout server shell
    CheckoutForm.tsx      # client form (single-page, COD)
    OrderSummary.tsx      # sticky right-column summary
    success/page.tsx      # /checkout/success?order=<id>
src/components/
  Header.tsx, Footer.tsx, NewsletterForm.tsx, ProductCard.tsx
  cart/                   # CartProvider (localStorage dub_cart_id), CartDrawer
  home/, product/, shop/  # section components
src/lib/
  medusa.ts               # server-only SDK
  cart-client.ts          # browser SDK + localStorage helpers
  region.ts, products.ts  # server-side fetches
  format.ts               # price formatting (en-MU, MUR)
  nav.ts                  # nav data
  checkout.ts             # MU districts, validators, toMedusaAddress
docs/superpowers/
  specs/2026-04-27-checkout-design.md
  plans/2026-04-27-checkout.md
```

## Conventions
- Server components by default. Add `"use client"` only when needed (cart, form state, `useSearchParams`/router, animations).
- Use existing color tokens — don't introduce new palette colors without flagging.
- Type imports come via `HttpTypes.Store…` from `@medusajs/types`. Real names sometimes differ from doc names (e.g. `StoreAddAddress`, not `StoreCreateAddress`). When in doubt, look at `node_modules/@medusajs/types/dist/http/`.
- Don't add Jest/Vitest/Playwright test infra unless explicitly asked. Verify via dev server + `tsc --noEmit` + `next build`.
- Read `node_modules/next/dist/docs/01-app/...` before assuming a Next.js API — v16 has breaking changes from training data (e.g. `searchParams` is `Promise<{...}>` in App Router pages).

## Checkout flow (COD-only)
Sequence in `CheckoutForm.handleSubmit`:
1. `cart.update` — email, shipping_address, billing_address, `metadata.notes` (when notes given)
2. `cart.addShippingMethod` — `option_id` from `fulfillment.listCartOptions`
3. `payment.initiatePaymentSession(cart, { provider_id: "pp_system_default" })` — Medusa's manual / COD provider
4. `cart.complete` — throws on `result.type !== "order"` using `result.error?.message`
5. (optional) `auth.register("customer", "emailpass", ...)` + `customer.create(...)` — silent failure, must not block the order
6. `clearCart()` — wipes localStorage `dub_cart_id` + in-memory cart
7. `router.push('/checkout/success?order=<id>')`

## Smoke-test checklist
Happy path: `/` → product → "Add to Bag" → drawer opens → "Proceed to Checkout" → fill form → "Place Order" → `/checkout/success` shows order number → Medusa admin shows order with `metadata.notes` and `pp_system_default` payment.

Edge cases:
- `/checkout` with empty cart → empty state, no redirect
- Blank email submit → banner at top, inline field error, no Medusa call
- Untick "Same as shipping" with different billing → admin shows two addresses
- "Create account" with fresh email → admin shows linked customer
- "Create account" with already-registered email → order still completes, console warning
- `/checkout/success?order=invalid` → graceful "Your order was placed" with the bad ID (not a silent home redirect)

## Image domains
`next.config.ts` `remotePatterns` covers `**.dollupboutique.com`, S3, R2, Unsplash, Medusa public bucket. The product CDN at `cdn.dollupboutique.com` currently 404s on some product slugs — CDN/data issue, not frontend.

## Deferred features (not in scope unless picked up)
- Discount / promo codes
- Customer accounts UI (`/account`, login, address book)
- Order history (`/account/orders`, `/order/<id>`)
- Email order confirmations (Medusa backend notification provider)
- Address autocomplete
- International / multi-region shipping (currently MU-only)

## Common commands
```
npm run dev              # localhost:3000
npm run build            # production build
npm run lint
npx tsc --noEmit         # type check
```
