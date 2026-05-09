# Analytics Tracking Plan

**Stack:** Google Tag Manager (GTM) → GA4 + Meta Pixel + Meta CAPI (deferred)
**Consent:** Google Consent Mode v2, default-denied. Unlocked on user "Accept all".
**Currency:** MUR
**Brand:** Doll Up Boutique

## Architecture

```
Next.js storefront
  └── window.dataLayer.push({ event, ecommerce })
        ↓
    GTM container (NEXT_PUBLIC_GTM_ID)
        ├── GA4 Configuration tag (Measurement ID inside GTM)
        ├── GA4 Event tags (one per ecommerce event below)
        ├── Meta Pixel base tag (Pixel ID inside GTM)
        └── Meta Pixel Event tags (mapped from dataLayer events)
```

The frontend **only** pushes to `dataLayer`. Tag firing, IDs, and trigger logic live inside GTM. To swap GA4 properties or add Meta Pixel, edit the GTM container — no frontend deploy required.

Consent state is owned by `localStorage["dub_consent_v1"]` (values `accepted` / `rejected`). On Accept, the storefront calls `gtag('consent', 'update', { ... 'granted' })` + `fbq('consent', 'grant')`, which lets GTM proceed with tag firing.

## Events

All events fire from `src/lib/analytics.ts`.

| `event` | Where it fires | Function | GA4 mapping | Meta Pixel mapping |
|---|---|---|---|---|
| `page_view` | Initial load (GTM) + every SPA route change (`RouteChangeTracker`) | `pushPageView()` | `page_view` | `PageView` |
| `view_item` | PDP — `ProductBuy` mount + on every variant change | `trackViewItem()` | `view_item` | `ViewContent` |
| `add_to_cart` | After successful `cart.createLineItem` in `CartProvider.addItem` | `trackAddToCart()` | `add_to_cart` | `AddToCart` |
| `view_cart` | Each time `CartDrawer` opens | `trackViewCart()` | `view_cart` | (no native — custom) |
| `begin_checkout` | `CheckoutForm` mount once cart hydrates with items | `trackBeginCheckout()` | `begin_checkout` | `InitiateCheckout` |
| `add_shipping_info` | After `cart.addShippingMethod` succeeds in submit handler | `trackAddShippingInfo()` | `add_shipping_info` | (custom) |
| `add_payment_info` | After `payment.initiatePaymentSession` in submit handler | `trackAddPaymentInfo()` | `add_payment_info` | `AddPaymentInfo` |
| `purchase` | `success/page.tsx` once order loads (guarded by ref) | `trackPurchase()` | `purchase` | `Purchase` |
| `consent_accepted` | `ConsentBanner` Accept all | `applyConsent("accepted")` | (custom) | (n/a) |
| `consent_rejected` | `ConsentBanner` Reject all | `applyConsent("rejected")` | (custom) | (n/a) |

## Item shape

Every ecommerce event includes an `items` array shaped like:

```js
{
  item_id: "<variant-id>",        // falls back to product_id, then line.id
  item_name: "<product title>",
  item_brand: "Doll Up Boutique",
  item_category: "<first category name>",   // when available
  item_variant: "<variant title>",          // e.g. "M / Black"
  price: 1500,
  quantity: 1,
  currency: "MUR"
}
```

`view_item` always has `quantity: 1`. `add_to_cart` includes the actual `quantity`. `view_cart` / `begin_checkout` / `add_shipping_info` / `add_payment_info` send the full cart line array. `purchase` sends the order line array plus `transaction_id` (the human-readable `display_id` falling back to UUID), `tax`, and `shipping`.

## GTM tag configuration

For each GA4 event tag inside GTM:

1. Tag type: **GA4 Event**
2. Configuration tag: your single GA4 Configuration tag (with the Measurement ID `G-XXXXXXX`).
3. Event name: match the table above (e.g. `view_item`).
4. Event Parameters: enable **Send ecommerce data** and source from `Data Layer` so GA4 picks up the `ecommerce` object automatically.
5. Trigger: **Custom Event** matching the `event` name (e.g. `view_item`).

For Meta Pixel event tags, use a custom HTML tag (or the official Facebook Pixel template from the Community Gallery) that calls `fbq('track', '<EventName>', { ... })` mapped from the same dataLayer fields.

## Consent Mode v2 wiring

Default state (set in `TagManager.tsx`, `beforeInteractive`):

```
ad_storage: denied
analytics_storage: denied
ad_user_data: denied
ad_personalization: denied
personalization_storage: denied
functionality_storage: denied
security_storage: granted
```

On Accept all: every key flips to `granted`. On Reject all: stays denied (the banner just dismisses). Users can change later via /privacy (link reserved — banner can be re-summoned by clearing localStorage; a "manage cookies" affordance is post-launch work).

## Out of scope (post-launch)

- **Server-side Meta CAPI** — `src/app/api/meta-capi/route.ts` not yet built. Improves attribution ~15-20% by deduping browser pixel events with hashed customer email + order id from the server side.
- **Server-side GA4 Measurement Protocol** — same idea for ad-blocker resilience.
- **Custom audiences** — built inside Meta Ads Manager from the events above.
- **Funnel analysis dashboard** — GA4 Explorations + a Looker Studio template.
- **A/B test framework** — would tie experiment IDs into the dataLayer.

## Local testing without IDs

If `NEXT_PUBLIC_GTM_ID` is unset:
- `<TagManager />` renders nothing.
- `<ConsentBanner />` stays hidden.
- `pushEvent()` still appends to `window.dataLayer` — useful for inspecting in DevTools without sending data anywhere.

To verify dataLayer entries during local dev: open DevTools console and run `window.dataLayer` after triggering an action.
