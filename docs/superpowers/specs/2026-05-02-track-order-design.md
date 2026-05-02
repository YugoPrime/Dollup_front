# Track Order — Design Spec

**Date:** 2026-05-02
**Status:** Approved
**Author:** Rahvi (with Claude)

## Goal

Let any customer check the status of an order they placed, without an account, by entering their order number plus the phone number used at checkout. Surfaces a 5-step delivery timeline and reserves a slot for a Mauritius Post tracking link to be added in a later iteration.

## Decisions (locked in)

| Decision | Choice |
|---|---|
| Identification | Order number + phone (no account required) |
| Lookup mechanism | Next.js Route Handler at `POST /api/track-order` (server-side) |
| Phone matching | Digits-only comparison after stripping leading `230` country code |
| Error policy | Generic "not found" for both missing order and phone mismatch (no enumeration) |
| Result content | Status badge + 5-step timeline + items recap + delivery address |
| Discoverability | Footer link + button on `/checkout/success` (pre-fills order number) |
| External tracking | Reserve a slot on the "Out for delivery" step for a Mauritius Post tracking code + link |
| Auth on backend | None — uses public Medusa Store API |
| Rate limiting | Out of scope for v1, documented in code |

## User flows

### Entry points

- Footer "Track Order" link → `/track-order`
- `/checkout/success` → "Track this order" button → `/track-order?order=DUB1042` (pre-fills order field, focuses phone field)

### Happy path

1. Customer lands on `/track-order` (or arrives with `?order=` pre-filled).
2. Enters order number + phone, clicks **Track**.
3. Form submits to `POST /api/track-order`.
4. Page renders: status badge, 5-step timeline, items recap, delivery address.
5. If a tracking number exists on the order's fulfillment, the "Out for delivery" step shows the code and a link to `https://www.mauritiuspost.mu/track-trace/?tracking_code=<code>`.

### Error path

- Order not found OR phone mismatch → generic banner: *"We couldn't find an order matching those details. Double-check your order number and phone number."* The order field stays filled; phone clears for retry.
- Network error → distinct banner: *"Couldn't reach the server. Please try again."*

## Architecture

### File layout

```
src/app/track-order/
  page.tsx              // client: orchestrates form + result + error banner
  TrackOrderForm.tsx    // client: order# + phone inputs, submit
  OrderTimeline.tsx     // client: 5-step timeline
  OrderResult.tsx       // client: status badge + timeline + items + address
src/app/api/track-order/
  route.ts              // POST handler
src/lib/track-order.ts  // pure helpers: phone normalization, status mapping, types
src/components/Footer.tsx           // add "Track Order" link
src/app/checkout/success/page.tsx   // add "Track this order" button
```

> Before implementing, verify App Router conventions in `node_modules/next/dist/docs/` — repo's `AGENTS.md` warns this Next.js version may differ from training data.

### Why split into 4 files

- `TrackOrderForm` owns input state + submission.
- `OrderResult` is pure presentation given a fetched order.
- `OrderTimeline` is reusable in isolation, easy to iterate visually without touching the form.
- `page.tsx` orchestrates: shows form, shows result on success, shows error banner on failure.

### Why a server route handler instead of calling Medusa SDK from the browser

- Phone normalization runs once on the server, not duplicated in the client bundle.
- The order is stripped to only the fields the page needs — no internal Medusa fields leak.
- Lets us add per-IP rate limiting later in this same handler without changing the page.

## Route Handler API contract

`POST /api/track-order`

### Request body

```ts
{ orderRef: string; phone: string }
```

- `orderRef` — accepts `DUB1042`, `#DUB1042`, or raw Medusa ID `order_01HXYZ…`. Trimmed, `#` stripped, uppercased.
- `phone` — any user-typed format.

### Server flow

1. Normalize `orderRef` → trim, strip `#`, uppercase.
2. Normalize `phone` → digits only; drop leading `230` if 11 digits and starts with `230`.
3. Look up order:
   - If `orderRef` starts with `order_` → `sdk.store.order.retrieve(orderRef, { fields })`
   - Else → `sdk.store.order.list({ display_id: parseInt(orderRef.replace(/^DUB/i, ""), 10), fields, limit: 1 })`
4. If no order found → `404 { error: "not_found" }`.
5. Compare `normalizePhone(order.shipping_address?.phone ?? "")` to normalized input. Mismatch → `404 { error: "not_found" }` (same response as missing order).
6. Build sanitized response (below).

### Response (200)

```ts
{
  displayId: string;             // "DUB1042"
  status: "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "canceled";
  placedAt: string;              // ISO
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  items: Array<{
    title: string;
    variantTitle?: string;
    quantity: number;
    unitPrice: number;
    thumbnail?: string;
  }>;
  totals: { subtotal: number; shipping: number; total: number; currency: string };
  trackingCode: string | null;   // from order.metadata.tracking_code (or fulfillments[0].metadata.tracking_code)
  trackingUrl: string | null;    // built when trackingCode present
  canceledAt: string | null;
  steps: {
    placedAt: string;            // order.created_at
    confirmedAt: string | null;  // order.metadata.confirmed_at (if string-ISO) — else null
    packedAt: string | null;     // order.fulfillments[0].packed_at
    shippedAt: string | null;    // order.fulfillments[0].shipped_at
    deliveredAt: string | null;  // order.fulfillments[0].delivered_at
  };
}
```

### Response (404)

```ts
{ error: "not_found" }
```

### Display ID note

The existing `/checkout/success` page renders `#${order.display_id}` where `display_id` is a Medusa-issued integer. The frontend prepends `DUB` for display only. The route handler must strip `DUB` before parsing the integer for the `display_id` lookup. **Verify this format matches actual orders before shipping** — if your store's display IDs include a different prefix or are non-numeric, adjust the parsing.

## Status mapping

| Step | Label | Reached when |
|---|---|---|
| 1 | Placed | order exists (always reached for non-canceled orders) |
| 2 | Confirmed | `order.metadata.confirmed_at` set OR `order.fulfillment_status !== "not_fulfilled"` |
| 3 | Packed | `order.fulfillment_status` ∈ `fulfilled` / `partially_fulfilled` / `shipped` / `delivered` |
| 4 | Out for delivery | `order.fulfillment_status` ∈ `shipped` / `delivered` |
| 5 | Delivered | `order.fulfillment_status === "delivered"` |

### "Confirmed" — the soft step

Medusa has no built-in "confirmed by phone call" state. We support both:
- **Preferred (long-term):** Admin sets `order.metadata.confirmed_at` after the COD confirmation call. No backend code change — just a field set in admin.
- **Fallback (immediate):** Any fulfillment activity implicitly lights up "Confirmed" before "Packed."

This way the step is meaningful from day one, and accuracy improves once the metadata habit is adopted.

### Cancellation

If `order.canceled_at` is set, the timeline is replaced by a single muted block: *"Order canceled on {date}"*. Items recap and address still render below for reference.

### Tracking code (Mauritius Post slot)

When `order.fulfillment_status` is `shipped` or `delivered` AND a tracking code exists in metadata:
- `trackingCode` = `order.metadata.tracking_code` (preferred) OR `order.fulfillments[0].metadata.tracking_code` (fallback), whichever is a non-empty string first
- `trackingUrl` = `https://www.mauritiuspost.mu/track-trace/?tracking_code=<code>`

> **Verified against `node_modules/@medusajs/types/dist/http/order/`:** Medusa v2's Store API `BaseOrderFulfillment` does NOT expose `labels[]` or `tracking_links[]` — those fields are admin-only. The Store-API-friendly path is to surface the tracking code via metadata. Recommended admin workflow: when marking a fulfillment shipped, also set `order.metadata.tracking_code = "<RR…MU>"` in the Medusa admin. The fulfillment's own `metadata` is also Store-readable as a fallback.

The "Out for delivery" timeline step renders below its label:
> Tracking: **RR123456789MU** — [Track on Mauritius Post →]

When the tracking number is missing, the step still lights up but the tracking line is hidden (no broken link).

## Visual treatment

- Status badge above timeline — colored pill: coral for active states, emerald for delivered, ink-muted for canceled.
- Timeline circles: filled coral when reached, outlined ink-soft when not. Connector lines between adjacent reached steps use coral; otherwise ink-soft.
- Each step shows label + timestamp underneath when reached.
- Mobile: timeline stacks vertically (5 rows). Desktop: horizontal.
- Tokens used: `coral-500`, `blush-300`, `ink`, `ink-muted`, `font-display` for labels, `font-sans` for body.

## Phone normalization

Single helper, lives in `src/lib/track-order.ts`, used by the route handler on both the input and the stored phone before comparison.

```ts
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("230")) return digits.slice(3);
  return digits;
}
```

Empty string never matches a real order. Both compared as digit strings.

## Edge cases

| Case | Behavior |
|---|---|
| Empty form submit | Inline field errors, no API call |
| Invalid order # format | Generic not-found banner (don't leak format hint) |
| Order found, phone mismatch | Generic not-found banner |
| Canceled order | Timeline replaced by canceled block |
| `trackingCode` missing on shipped order | Step lights up, tracking line hidden |
| Network error | Distinct banner: *"Couldn't reach the server. Please try again."* |
| Customer pastes `#DUB1042` | `#` stripped, works |
| `?order=DUB1042` URL param | Pre-fills order field, focuses phone field |

## Accessibility

- Form labels visible (not placeholder-only).
- Submit button shows loading state and is disabled while in flight (prevents double-submit).
- Status badge conveys meaning via both color and text.
- Timeline circles get `aria-current="step"` on the latest reached step.
- Error banner has `role="alert"`.

## Out of scope (explicitly)

- Rate limiting / bot protection — note in route-handler code, add when needed.
- Saving recent order lookups in localStorage.
- Email / SMS notifications when status changes (backend feature).
- Live polling — page loads status once; customer refreshes to see changes.
- Account-based tracking ("see all my orders") — needs `/account` UI which is deferred.
- Hard sealing of the underlying Medusa retrieve endpoint.
- Mauritius Post API integration. The slot is reserved on the timeline for a tracking code + link; actually populating it requires admin to set the tracking number on the fulfillment in Medusa. Automated scraping or an API integration with mauritiuspost.mu can be added later without changing this page's layout.

## Known limitation

The phone gate on `/track-order` is **defense-in-depth UX, not a hard security boundary**. The underlying Medusa `store.order.retrieve(orderId)` endpoint is publicly callable with just an order ID — that's how the existing `/checkout/success` page already works. Sealing this requires backend changes in `Backend/dollup-medusa/` and is out of scope for this spec.

## Smoke test (post-implementation)

Happy path: place an order via existing checkout → on success page click "Track this order" → confirm `?order=` is pre-filled → enter the same phone → see status badge + timeline at "Placed" → confirm items and address match.

Edge cases:
- Submit with a wrong phone → generic not-found banner.
- Submit with a made-up order number → same generic banner.
- Submit `#DUB<id>` with `#` and uppercase → still resolves.
- Mark the order shipped in Medusa admin and add a tracking number → refresh `/track-order?order=…` → confirm tracking code + Mauritius Post link render under "Out for delivery."
- Cancel the order in admin → refresh → confirm timeline replaced by canceled block.
- Submit empty form → inline field errors, no network call.
