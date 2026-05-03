# DM Admin Orders — implementation plan

**Goal:** Solo founder takes orders via Instagram/Facebook/WhatsApp DMs. Today she logs them in a Google Sheet which doesn't decrement Medusa stock — so she risks selling the same item twice. Replace the Sheet with a mobile-friendly admin route on the storefront that (a) lets her quickly check stock by SKU while replying to DMs, and (b) lets her record an order in a spreadsheet-row-feel form that creates a real Medusa order and decrements inventory atomically.

**Owner:** solo project (eabmarkets@gmail.com / Rahvi)
**Deadline pressure:** she takes DM orders daily. Tomorrow's session needs at minimum the stock checker working.
**Out of scope:** customer login, public storefront checkout changes, refund/return UI, edit-existing-order UI, email confirmations.

---

## Context the implementer needs

### Repo layout
- Storefront: `DUB-front/` (Next.js 16 App Router, React 19, Tailwind v4, `@medusajs/js-sdk@2.14.1`)
- Backend: Medusa v2 at `https://api.dollupboutique.com`
- IDs (already in use across `inventory-audit/scripts/import-medusa.ts`):
  - `REGION_ID = "reg_01KN0AAX4FA592Q3HAY93W1AHV"` (Mauritius, MUR)
  - `SALES_CHANNEL_ID = "sc_01KN07JKHRN9DP25TM5S664C5W"` (Default)
  - `STOCK_LOCATION_ID = "sloc_01KN48PYHQ0DTXXN2N0JWZSAYV"` (DollUp Warehouse)
  - `CURRENCY_CODE = "mur"`
- Storefront publishable key (already in `DUB-front/.env.local`):
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_084764f1d6a10aeee09219b33caa29a64f13acb96d5e16a93c7ebc6879a47724`
- Admin email/pass: in user's `inventory-audit/.env.local` (`MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`). The storefront does NOT currently have these — they'll need to be added to `DUB-front/.env.local` and to Coolify env vars (see Auth section below).

### Read these first
- `DUB-front/CLAUDE.md` and `DUB-front/AGENTS.md` — Next.js 16 has breaking changes from training data. **Always check `node_modules/next/dist/docs/` for any Next.js API before using it.**
- `DUB-front/src/lib/medusa.ts` — server-only SDK client (publishable key, no admin auth)
- `DUB-front/src/lib/checkout.ts` — Mauritius districts list, phone validation, address shape
- `DUB-front/src/app/checkout/CheckoutForm.tsx` — existing COD checkout flow, useful reference
- `inventory-audit/scripts/import-medusa.ts` — shows the exact admin SDK auth pattern (JWT in memory) we'll mirror server-side

### What the user's existing Google Sheet tracks (per screenshot at `Backend/please check cells.jpg`)
| Sheet column | Maps to in our form |
|---|---|
| Month | derived from Entry Date |
| Entry Date | `created_at` (Medusa default) |
| Delivery Date | order metadata.delivery_date |
| Way of Delivery | shipping method (Pick Up / Home Delivery / Postage / Express Postage / Rodrigues Postage / By Courier / My Delivery) |
| GSheet Order # | not needed — Medusa generates display_id |
| Buyer Name | shipping_address.first_name (split optional) |
| Buyer Address | shipping_address.address_1 |
| Buyer Address Details | shipping_address.address_2 |
| Buyer Contact | shipping_address.phone (8-digit MU mobile) |
| 1st/2nd/3rd Product SKU | line items (n products, not capped at 3) |
| Manual Product | custom line item (not from catalog) |
| Delivery Cost | shipping rate (auto-computed by method, overridable) |
| Discount | order-level discount (line item or adjustment) |
| Total Sales Price | computed from items + delivery − discount, **overridable** |
| Method of Payment | metadata.payment_method ("cash", "juice", "card", etc.) |
| Point of Sale | metadata.point_of_sale ("facebook", "instagram", "whatsapp", "in_store") |
| Sale Type | metadata.sale_type ("paid", "unpaid", "deposit") |
| Status | order status (Pending / Delivered / Cancelled) |

### Delivery methods + rates (confirmed by user)
| Method | Rate (MUR) | Notes |
|---|---|---|
| Pick Up | 0 | always free |
| Home Delivery | 0 if `subtotal ≥ 1500`, else 150 | auto-adjust per order total |
| Postage | 70 | flat |
| Express Postage | 110 | flat |
| Rodrigues Postage | 120 | flat |

### Mauritius phone format
8-digit mobile, typically starts with 5 (e.g. `5XXX XXXX`). Existing validator in `DUB-front/src/lib/checkout.ts` — reuse it.

---

## Architecture

### Auth approach
**Single shared password, server-validated cookie session.** Simple, solo-founder-grade.

- New env var on the storefront: `ADMIN_PASSWORD` (set in `DUB-front/.env.local` and Coolify)
- New env vars: `MEDUSA_ADMIN_EMAIL`, `MEDUSA_ADMIN_PASSWORD` (server-only — no `NEXT_PUBLIC_` prefix). The storefront server uses these to call Medusa admin API.
- **Login flow:**
  - `GET /admin/login` → renders password form
  - `POST /admin/login` → server action checks `password === process.env.ADMIN_PASSWORD`. If ok, sets `httpOnly` `dub_admin_session` cookie (signed with `ADMIN_SESSION_SECRET`, 24h expiry). Else returns error.
- **Middleware** at `src/middleware.ts`: any path under `/admin/*` (except `/admin/login`) requires the cookie. If missing → redirect to `/admin/login?next=...`.
- The actual admin API calls happen server-side via a singleton (see "Server-side admin SDK" below). The browser never sees admin credentials.

### Server-side admin SDK
New file: `src/lib/medusa-admin.ts` (server-only, NOT imported by client components).

```ts
import "server-only";
import Medusa from "@medusajs/js-sdk";

let cached: Medusa | null = null;
let tokenExpiresAt = 0;

export async function getAdminSdk() {
  if (cached && Date.now() < tokenExpiresAt - 60_000) return cached;
  const sdk = new Medusa({
    baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
    auth: { type: "jwt", jwtTokenStorageMethod: "memory" },
  });
  await sdk.auth.login("user", "emailpass", {
    email: process.env.MEDUSA_ADMIN_EMAIL!,
    password: process.env.MEDUSA_ADMIN_PASSWORD!,
  });
  cached = sdk;
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000; // refresh ~daily
  return sdk;
}
```

All admin operations route through this. No admin secrets on the client.

### Order creation strategy: Medusa Draft Order → Complete
For each saved order:
1. `POST /admin/draft-orders` with `{ region_id, sales_channel_id, customer_email, items, shipping_address, billing_address, shipping_methods, metadata }`
   - `items[]` includes both catalog variants (`{ variant_id, quantity, unit_price }`) and custom items for the "Manual Product" row (`{ title, quantity, unit_price }`)
   - `unit_price` overrides the variant's calculated price → handles per-order price tweaks
2. `POST /admin/draft-orders/:id/payment` with `{ provider_id: "pp_system_default" }` (COD)
3. `POST /admin/draft-orders/:id/complete` → returns the real order, decrements inventory at the warehouse, generates display_id

If "Sale Type" is **Paid** → also call `POST /admin/payments/:id/capture` so the order shows paid in admin.
If "Sale Type" is **Unpaid** → leave uncaptured.

**Stock-decrement guarantee:** Medusa decrements `stocked_quantity` on `draft-order/complete`. If the variant is at 0, complete will fail — surface the error in the UI so the user sees "out of stock, refresh".

### Shipping rate handling
Medusa shipping rates are tied to a fulfillment provider. Two options:
- **(a) Use Medusa shipping options** — requires the 5 methods to be set up in `setup-shipping.ts` with conditional pricing. Rodrigues etc. likely don't exist yet. More work.
- **(b) Add as a custom line item** — add a `{ title: "Delivery — Home Delivery", unit_price: 150 }` line to the draft order. Simple, fully under our control, can do the "free above 1500" math client-side.

**Use (b) for v1.** Skip native shipping methods. The order total still adds up correctly; the tradeoff is that fulfillment isn't formally split from items. Acceptable for solo DM workflow.

### "Manual Product" line
Add an extra row in the form with two fields: name + price. Sent as a custom line item — no `variant_id`, just `title` + `unit_price` + `quantity`. Doesn't affect inventory.

### Total override
After all line items + delivery − discount = computed total, show it as the default in a `totalOverride` input. If the user types a different number, on save we add a single adjustment line `{ title: "Adjustment", unit_price: <delta> }` so the final order total matches. (Negative unit_price = discount.)

---

## File-by-file implementation

### New env vars
Add to `DUB-front/.env.local` AND Coolify:
```
ADMIN_PASSWORD=<pick a strong one>
ADMIN_SESSION_SECRET=<openssl rand -base64 32>
MEDUSA_ADMIN_EMAIL=<from inventory-audit/.env.local>
MEDUSA_ADMIN_PASSWORD=<from inventory-audit/.env.local>
```

### `src/middleware.ts` (new)
Gate `/admin/*` routes (except `/admin/login`).
```ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();
  const session = req.cookies.get("dub_admin_session")?.value;
  if (!session || !verify(session)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*"] };
function verify(token: string): boolean {
  // HMAC-verify with ADMIN_SESSION_SECRET; reject expired
  // (tiny inline impl — no external deps)
  ...
}
```

### `src/lib/admin-session.ts` (new)
HMAC sign + verify for the session cookie (use Node `crypto`, no deps). Token = base64(`${expiresAt}.${hmac}`). Cookie is `httpOnly`, `sameSite=lax`, `secure` in prod.

### `src/lib/medusa-admin.ts` (new)
Server-only admin SDK singleton (see Architecture section above).

### `src/lib/admin-orders.ts` (new)
Server functions used by the page + server actions:
- `searchVariantsBySku(query: string): Promise<VariantHit[]>` — admin variant search, returns `{ id, sku, title, product_title, product_thumbnail, inventory_quantity, manage_inventory, price_mur }[]` for use in the stock checker AND the product picker. Filter: only variants with `inventory_quantity > 0` when `availableOnly` flag is true.
- `getRecentOrders(limit = 20): Promise<OrderRow[]>` — admin order list, fields: `id, display_id, created_at, customer_email, items.*, shipping_address.*, total, payment_status, fulfillment_status, metadata`
- `createDmOrder(input: CreateOrderInput): Promise<{ id: string; display_id: number }>` — full draft-order → payment → complete pipeline (see Architecture > Order creation strategy).
- `markFulfilled(orderId: string)` / `markPaid(orderId: string)` — wrap admin endpoints.

### `src/app/admin/login/page.tsx` (new)
Tiny password form. Server action validates against `ADMIN_PASSWORD`, sets cookie, redirects to `?next` or `/admin/orders`.

### `src/app/admin/orders/page.tsx` (new) — the main route
Single-page mobile-first layout:

**Section 1: Stock Checker (top, sticky on mobile)**
```
[ Search SKU or product name ____________ ] 🔍
```
- Uses a client component with debounced search (300ms)
- Shows results as cards:
  ```
  ┌─────────────────────────────────────┐
  │ [thumb] IS2275  Floral Maxi Dress    │
  │   S Pink     ✅ 3 in stock           │
  │   M Pink     ✅ 1 in stock           │
  │   L Pink     ❌ Sold Out             │
  └─────────────────────────────────────┘
  ```
- Tap a variant → opens the order form below pre-populated with that variant
- This section has NO availableOnly filter — sold-out variants must be visible so she can confirm "no, that one's gone"

**Section 2: New Order Form**
Spreadsheet-row-feel: inputs laid out in a single visual row on desktop, stacked on mobile. Fields:

| Field | Type | Notes |
|---|---|---|
| Buyer Name | text | required |
| Phone | tel | 8 digits, MU regex |
| Address (line 1) | text | required |
| Address details | text | optional |
| District | select | reuse `MU_DISTRICTS` from `src/lib/checkout.ts` |
| Way of Delivery | select | Pick Up / Home Delivery / Postage / Express Postage / Rodrigues Postage |
| Delivery Date | date | optional |
| **Products** | repeating sub-rows | each row: SKU autocomplete + qty + unit price (MUR, editable). [+ Add product] button below. **Autocomplete only shows variants with stock > 0.** Tap variant → fills SKU + name + default price |
| Manual Product (optional) | name + price | one custom line item not in catalog |
| Discount | number (MUR) | optional, applied at order level |
| Method of Payment | select | Cash / MCB Juice / Bank Transfer / Card / Other |
| Point of Sale | select | Facebook / Instagram / WhatsApp / In Store / Other |
| Sale Type | select | Paid / Unpaid / Deposit |
| **Subtotal** (computed) | display | sum(items) + manual_product − discount |
| **Delivery cost** (computed) | display | per delivery method, with the "free above Rs.1500 for Home Delivery" rule applied |
| **Total** (override) | number, defaults to subtotal+delivery | typing here adds an Adjustment line for the delta |
| Status | select | defaults Pending; Delivered/Cancelled also available |
| Notes | textarea | optional |
| **[ Save Order ]** | button | calls server action |

On save: server action calls `createDmOrder()`. On success: clears form, toasts "Order #1234 saved", appends to recent table.

**Section 3: Recent Orders Table**
Last 20 orders. Columns: # / Date / Buyer / Total (MUR) / Method / POS / Status / actions (Mark Paid / Mark Fulfilled / Cancel). Tap row to expand and see line items + address.

### `src/app/admin/orders/components/StockChecker.tsx` (new, client)
Debounced search box + result cards. Uses `useTransition` for non-blocking server action calls. Server action `searchVariantsAction(query, { availableOnly: false })`.

### `src/app/admin/orders/components/OrderForm.tsx` (new, client)
The big form. Use `useState` for the line-item array. Computed totals derived from state (no extra effects). On submit: server action `createDmOrderAction(formData)`.

### `src/app/admin/orders/components/RecentOrders.tsx` (new, server)
Renders the last 20 from `getRecentOrders()`. Server component so it always shows fresh data (no caching).

### `src/app/admin/orders/actions.ts` (new, server actions)
- `searchVariantsAction(query: string, opts: { availableOnly: boolean })`
- `createDmOrderAction(input: CreateOrderInput)`
- `markPaidAction(orderId: string)` / `markFulfilledAction(orderId: string)` / `cancelOrderAction(orderId: string)`
- `revalidatePath("/admin/orders")` after mutations.

### `src/lib/checkout.ts` — extend, don't duplicate
Add helper: `computeDeliveryCost(method: DeliveryMethod, subtotalMur: number): number`. Reuse from both this admin page AND the existing storefront checkout if it ever needs it.

### Mobile bottom nav exception
The new `MobileBottomNav` (already in `src/app/layout.tsx:49`) shouldn't show on `/admin/*`. Wrap it in a check or hide it via the route segment.

---

## Tech-specific gotchas

### Next.js 16 specifics
- Server actions: declare with `"use server"` at top of file. Form submissions via `<form action={action}>`.
- `searchParams` is a `Promise<{...}>` in App Router pages.
- `revalidate = 0` (or `dynamic = "force-dynamic"`) on `/admin/orders/page.tsx` so the recent-orders table is always fresh.
- **Read `node_modules/next/dist/docs/01-app/01-getting-started/14-route-handlers-and-middleware.mdx` and the relevant server-actions doc before writing middleware or actions.** Do not assume Next 14/15 patterns work.

### Medusa SDK admin auth in Node
The `auth.login("user", "emailpass", {...})` pattern with `jwtTokenStorageMethod: "memory"` is mandatory for server-side calls (cookies/localStorage don't exist). See `inventory-audit/scripts/import-medusa.ts` for working precedent.

### Draft order custom price
`unit_price` on a draft-order line item overrides the variant's calculated price. Confirmed in Medusa v2 docs. If the API rejects, fall back to: create with normal price, then `POST /admin/draft-orders/:id/items/:item_id` to update the price before completing.

### Inventory check race
Two DM customers, same last-of-kind: even with this admin form, a race is possible. Acceptable for a solo founder with one device. If she ever runs two browser tabs, document it as a risk in the page header.

### Shipping cost as line item
Don't try to use Medusa native shipping methods for v1. Add the delivery cost as a custom line item titled `Delivery — Home Delivery (Rs.150)`. Cleaner than fighting fulfillment-provider config.

### Rounding
All MUR amounts are integers (no cents in this market's conventions). Store as integers; format with `format-mur` helper from `src/lib/format.ts`.

---

## Verification checklist (subagent must execute before reporting done)

1. `npx tsc --noEmit` — clean
2. `npm run build` — clean
3. **Login**: visit `https://shop.dollupboutique.com/admin/orders` → redirected to `/admin/login`. Wrong password → error. Right password → cookie set, redirected back. (User to verify in browser; subagent runs the dev server + reports the URL.)
4. **Stock checker**:
   - Type `IS2275` → results show with per-variant stock
   - Type a sold-out SKU → shows "Sold Out" badge
   - Type a substring → product-name autocomplete also works
5. **Order form**:
   - Fill all required fields
   - Add 2 catalog products + 1 manual product
   - Set Way of Delivery = "Home Delivery"
     - With subtotal `< 1500` → delivery shows Rs.150
     - Bump qty so subtotal `>= 1500` → delivery shows Rs.0
   - Set Way of Delivery = "Rodrigues Postage" → Rs.120
   - Override total → adjustment line added correctly
   - Save → order appears in Medusa admin, inventory decremented for the catalog variants, manual line item present, payment provider = `pp_system_default`, metadata has `payment_method`, `point_of_sale`, `sale_type`, `delivery_date` (if set), `notes` (if any)
6. **Sold-out filter in product picker**:
   - Manually set a variant to qty 0 in Medusa admin
   - In the order-form product picker, search for that variant → it should NOT appear (only the in-stock siblings)
7. **Recent orders table**: shows the just-created order at top with correct buyer, total, status
8. **Mark Paid / Mark Fulfilled** buttons work end-to-end
9. **Mobile**: load on a phone-sized viewport (or DevTools device emulation). Stock checker is sticky at top, form is one column, buttons are tap-friendly (≥44px), no horizontal scroll
10. **Indexing**: confirm `/admin/orders` is also covered by the `noindex` from `src/app/layout.tsx` (it is — root layout applies). Belt-and-braces: also block `/admin/` in `src/app/robots.ts`.

---

## Don't do these things

- Don't add Jest/Playwright. Verification is manual + `tsc` + `next build` (per project convention in CLAUDE.md).
- Don't introduce new color tokens. Use existing `coral-*`, `blush-*`, `cream`, `ink*`.
- Don't add a customer-search/dedupe feature. Always create fresh customer records (or none — Medusa allows orderless of customers).
- Don't try to set up Medusa native shipping methods. Use custom line items.
- Don't build an "edit existing order" UI. If wrong, delete + recreate.
- Don't email order confirmations.
- Don't sync FROM Medusa back into a Google Sheet. The Sheet is being retired.
- Don't add backwards-compat for the Google Sheet workflow — no CSV import, no migration.

---

## Acceptance

User opens `/admin/orders` on her phone while replying to an Instagram DM. She types the SKU into the stock checker → sees "S Pink: 1 in stock". She tells the customer "yes available". She taps the variant → form pre-fills with that line item. She enters customer name + phone + address + delivery method + payment method, hits Save. Order appears in Medusa with stock decremented. The next time another DM asks about the same variant, she types the SKU and sees "Sold Out".

Total session time per order: ≤ 90 seconds.

---

## File index (so the subagent can sanity-check at the end)

New files:
- `src/middleware.ts`
- `src/lib/admin-session.ts`
- `src/lib/medusa-admin.ts`
- `src/lib/admin-orders.ts`
- `src/app/admin/login/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/actions.ts`
- `src/app/admin/orders/components/StockChecker.tsx`
- `src/app/admin/orders/components/OrderForm.tsx`
- `src/app/admin/orders/components/RecentOrders.tsx`

Modified files:
- `src/app/layout.tsx` — hide `MobileBottomNav` on `/admin/*` routes
- `src/lib/checkout.ts` — add `computeDeliveryCost()` helper
- `src/app/robots.ts` — add `Disallow: /admin/` (defensive)
- `.env.local` (you must add the 4 new env vars; not committed)
- Coolify env (user to add the same 4 vars in the Coolify dashboard before merge — flag this in the PR description)

Roughly 11 new files, 3 modified. Estimated 600–900 LOC. ~2–3 hours of focused implementation + 30 min verification.
