# DM Admin Orders v2 — Google Sheet–style entry + inline edit

**Date:** 2026-05-05
**Owner:** Solo project (eabmarkets@gmail.com / Rahvi)
**Replaces:** `docs/superpowers/plans/2026-05-03-dm-admin-orders.md` (v1 admin UI shipped in commits `45cd66c` + `8a0c03a`)

## Why redesign

The v1 admin UI works (login, stock checker, single-order create with atomic inventory decrement) but it's a stacked form per order. The founder has been using a Google Sheet for years and her muscle memory is row-based: type into a row at the top, scroll to see history, click a cell to edit. The v1 stacked form fights that mental model.

She edits past entries frequently (typo fixes, price corrections, mark delivered, add tracking). v1 has no edit path — to fix anything you'd cancel and recreate manually in Medusa admin.

This redesign:
1. Reorders fields and renames cells to match her existing Sheet exactly
2. Introduces a **hybrid layout** — Google Sheet–style entry+history table on desktop, stacked form on mobile, same data underneath
3. Adds **inline editing** for any field on any past order
4. Adds **customer search** (by name or phone) with autofill into the new entry
5. Adds **date filtering** (today / yesterday / last 7 days / this month / custom range)
6. Adds two new fields: **VAT breakdown** (when payment = Juice) and **Tracking number** (when delivery = Postage / Express Postage)
7. Removes the **District** field from the admin UI entirely (renamed to City + Address Details only)

Out of scope for this PR (deferred):
- Removing District from the public `/checkout` flow — separate spec, separate PR
- Customer record dedupe in Medusa (still creates fresh shipping addresses per order)
- Order-level CSV export, daily revenue summary, returns/refunds UI
- Email confirmations

## Decisions locked from brainstorming

| Decision | Choice | Reasoning |
|---|---|---|
| Layout | Hybrid (desktop sheet + mobile stacked, responsive at `lg` breakpoint = 1024px) | She uses both phone and desktop |
| Edit semantics | **B2 — cancel + recreate** for product/price changes; light-patch for everything else | Simpler than Medusa Order Edits API; founder doesn't share display_id with customers |
| VAT calculation | **Breakdown (extracted from VAT-inclusive total)** | VAT is a tax on revenue received digitally; Juice payments include 15% as part of the price the customer paid |
| Customer search behavior | Show past orders **+** "Use customer" button to autofill new entry | Saves real time on returning DM customers |
| District removal scope | Admin UI only here; public checkout removal deferred | Lower risk; admin work is already substantial |

## Page layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────┬───────────────┐
│ [🔎 Search by name / phone___]  [📅 Last 7 days ▾]   │ STOCK CHECKER │
│                                                      │ ┌───────────┐ │
│ ── New Order ──────────────────────────────────────  │ │ SKU/name  │ │
│ ┌──────────────────────────────────────────────────┐ │ └───────────┘ │
│ │ 📅date │way│name│city│addr│phone│products│...│✚│ │ │ IS2275       │
│ └──────────────────────────────────────────────────┘ │ S Pink ✅ 3   │
│                                                      │ M Pink ✅ 1   │
│ ── Recent Orders ─────────────────────────────────── │ L Pink ❌ 0   │
│ ✏️ #1234 │5/3│HD│Ana│PL│5712|...│Rs.1500│Cash│IG│✓│ │               │
│ ✏️ #1233 │5/3│PU│Ben│Quat|...│  Rs.800 │Juice│WA│-│ │               │
│ ✏️ #1232 │5/2│PO│Ces│PL│...│        Rs.620 │Cash│IG│ │               │
│ ↕ scroll for older orders, [Load older]              │               │
└──────────────────────────────────────────────────────┴───────────────┘
```

- Two-column page grid: left content column + right Stock Checker (~280px wide, sticky on scroll)
- Top bar: customer search + date filter
- New Order entry row: horizontal sheet-style row, fixed below the top bar
- Recent Orders: horizontal sheet table, scrollable inside its container; clicking ✏️ swaps the row's cells for inputs
- Default column set (compact, always visible): **Date / Way / Name / City / Phone / Products / Total / Payment / POS / Sale / Status / Tracking** (only when delivery = Postage / Express Postage)
- Hidden by default in compact view but visible when row is expanded for edit: Pseudo, Email, Address Details, Custom Notes, Manual Product, Discount, Delivery Date, VAT Breakdown
- Click ✏️ → row expands downward to reveal hidden fields, all become editable inputs

### Mobile / tablet (< 1024px)

```
┌────────────────────────────────┐
│ [🔎 Search]  [📦 Stock]  [📅]  │
│                                │
│ ── New Order ────────────────  │
│ Date:    [__________]          │
│ Way:     [__________]          │
│ Name:    [__________]          │
│ ...stacked form (same field    │
│ order as desktop sheet row)    │
│                                │
│ ── Recent Orders ───────────── │
│ ✏️ #1234 Ana   Rs.1500 ✓Deliv │
│ ✏️ #1233 Ben   Rs.800  Pending│
│ ↕ Load older                   │
└────────────────────────────────┘
```

- Single column; Stock Checker collapses to a `📦 Stock` button in the toolbar that opens a slide-up bottom drawer
- New Order: stacked form, same field order as the desktop sheet row
- Recent Orders: condensed list with `# / Name / Total / Status + ✏️`
- Tap ✏️ → slide-up bottom drawer (~90vh) with the same stacked form, pre-filled with the order's data, "Save" / "Cancel" sticky at bottom

### Breakpoint behavior summary

| Width | Layout | Edit UX |
|---|---|---|
| ≥ 1024px | Sheet table + right Stock Checker card | Inline row expansion |
| < 1024px | Stacked form + condensed list | Bottom drawer |

## Fields

Field order is identical for desktop sheet row, mobile stacked form, and edit drawer.

| # | Field | Type | Visibility | Storage | Notes |
|---|---|---|---|---|---|
| 1 | Delivery Date | date | always | `metadata.delivery_date` | optional |
| 2 | Way of Delivery | select | always | metadata + drives Delivery Fee | Pick Up / Home Delivery / Postage / Express Postage / Rodrigues Postage / By Courier / My Delivery |
| 3 | Name | text | always | `shipping_address.first_name` | single field used as full name |
| 4 | Pseudo | text | hidden, expand via "+" | `metadata.pseudo` | IG/social handle |
| 5 | City | text | always | `shipping_address.city` | replaces "District"; free text |
| 6 | Address Details | text | always (optional) | `shipping_address.address_1` | flat #, lane, etc. |
| 7 | Phone | tel | always | `shipping_address.phone` | 8-digit MU validator (existing) |
| 8 | Email | email | hidden, expand via "+" | `customer_email` (else synthesized `dm-{phone}@dollupboutique.local`) | rare, optional |
| 9 | Products | repeating | always | line items | SKU autocomplete + qty + unit price (editable). In-stock variants only |
| 10 | Custom Notes | textarea | always | `metadata.custom_notes` | e.g. "all Small even though M selected", "hide price" |
| 11 | Manual Product | name + price | hidden, expand via "+" | custom line item (no `variant_id`) | non-catalog item |
| 12 | Delivery Fee | number (MUR) | always | line item titled `Delivery — {method}` | auto-filled per method, **overridable**, total recomputes |
| 13 | Discount | number (MUR) | always | line item titled `Discount`, negative `unit_price` | optional |
| 14 | Total | number (MUR) | always | computed: items + manual + delivery − discount; if user types a different value, an `Adjustment` line is added for the delta | editable |
| 15 | Method of Payment | select | always | `metadata.payment_method` | Cash / MCB Juice / Bank Transfer / Card / Other |
| 16 | VAT 15% | display only | **shown only if payment = MCB Juice** | `metadata.vat_amount` | breakdown: "Of which VAT (15%): Rs.X" where X = round(Total × 0.15 / 1.15). Does NOT change Total. |
| 17 | Point of Sale | select | always | `metadata.point_of_sale` | Facebook / Instagram / WhatsApp / In Store / Other |
| 18 | Sale Type | select | always | `metadata.sale_type` | Paid / Unpaid / Deposit |
| 19 | Status | select | always | order status / metadata | empty (default) / Delivered / Cancelled |
| 20 | Tracking # | text | **shown only if Way = Postage or Express Postage** | `metadata.tracking_number` | hidden in compact view + entry for other methods |

### Delivery Fee auto-fill rules

| Method | Default fee (MUR) | Notes |
|---|---|---|
| Pick Up | 0 | always free |
| Home Delivery | 0 if subtotal ≥ 1500, else 150 | re-evaluates on cart change |
| Postage | 70 | flat |
| Express Postage | 110 | flat |
| Rodrigues Postage | 120 | flat |
| By Courier | 0 | manual override expected |
| My Delivery | 0 | manual override expected |

User can override the fee for any method; total recomputes automatically.

### Hidden field expansion UX

- "+" cell in the entry row, ~24px wide, with tooltip "Add pseudo / email / manual product"
- Click → cell expands inline to an input (desktop) or the field renders below in the stacked form (mobile)
- Once typed-in, the field stays expanded for that entry session; clearing the value re-collapses on next render
- For inline edits on past rows: hidden fields with non-empty values render as cells; empty hidden fields show "+" to add

## Search, filter, customer autofill

### Customer search bar
- Single input, debounced 300ms
- Searches `shipping_address.first_name` (case-insensitive) AND `shipping_address.phone` (digits-only match)
- Server-side via Medusa admin orders endpoint with `q` parameter; we filter address fields client-side from the response (Medusa's `q` searches email/display_id by default — we wrap with our own filter)
- Result dropdown: deduped by phone, sorted by most-recent order. Each row: `Name — Phone — N orders, last MMM-DD`
- Click result → drops a chip at the top of the recent-orders list:
  - Filters the table to that customer's orders only
  - Adds button "📋 Use customer in new entry" → pre-fills name, pseudo (if any), city, address details, phone, email into the entry row
  - "✕" clears the filter

### Date filter
- Preset dropdown next to search: Today / Yesterday / Last 7 days / This month / Custom range...
- "Custom range..." → calendar picker for from / to dates
- Server-side `created_at` filter on the orders fetch
- Active filter shown as chip: "📅 Last 7 days ✕"

### Composing
- Search + date filter compose: "Ana" + "Last 7 days" returns Ana's orders in last 7 days
- Default page load: most recent 50 orders, no filter
- "Load older" button at bottom of the table → fetches next 50 (offset-based)

## Inline edit flow

### Two classes of edit, auto-detected

| Light edits — patched in place | Heavy edits — cancel + recreate |
|---|---|
| Status (Delivered / Cancelled) | Add / remove / change qty of a product |
| Tracking number | Change unit price |
| Custom notes | Manual product changes |
| Payment method, Sale type, POS, Pseudo | Delivery fee override |
| Delivery date | Discount |
| Name, Phone, City, Address details, Email | Total override |

User always sees a single **Save** button. Detection happens server-side by diffing the input against the stored order.

### Light edit path
- `POST /admin/orders/:id` for shipping_address changes
- Custom Medusa update for metadata fields
- Status changes: existing Medusa endpoints (`/cancel`, fulfillment status updates)
- Returns immediately; no inventory roundtrip
- Order display_id is preserved

### Heavy edit path

1. **Pre-flight stock check** — for each variant in the new payload, compute net inventory delta vs the old order. Fetch current stock at `STOCK_LOCATION_ID`. If any variant would go negative → refuse with a clear error: `"Not enough stock for IS2275 / S Pink — only 0 available"`
2. **Cancel** old Medusa order → Medusa returns inventory automatically
3. **Create** new draft order with edited data → complete it (decrements inventory)
4. **Stamp** new order with `metadata.replaces_order_id = <old_id>` and the old order with `metadata.replaced_by_order_id = <new_id>`
5. The Recent Orders fetcher filters out orders where `metadata.replaced_by_order_id` is set, so the user only sees the latest version
6. UI shows a small "↻ replaces #1230" caption beneath the new display_id, so the swap is visible in case she's cross-referencing Medusa admin

### Failure handling
- If step 3 fails after step 2 succeeded (rare but possible — e.g., Medusa transient error after cancel): the old order is already canceled. UI surfaces a sticky error: `"Recreate failed — old order is canceled. [Retry create]"` Click Retry → re-attempts step 3 with the same payload.
- The user is never silently left in a broken state.

### Cancel-vs-edit
- Setting Status = "Cancelled" in the row → light edit, just cancels the original order. No recreate.
- Editing line items → cancel + recreate (heavy path).

## Stock checker (right column / mobile drawer)

### Desktop (≥ 1024px)
- Square card, ~280×360px, sticky in the right column as you scroll
- Same internals as v1: debounced 300ms search, variant cards with thumb / SKU / variant title / per-variant stock count
- "Sold Out" cards still render (so she can see "no, that's gone")
- Tap a variant → adds it to the New Order entry's product picker (or to whichever order is currently being edited if a row is in edit mode)

### Mobile (< 1024px)
- Collapses to `📦 Stock` button in top toolbar
- Tap → slide-up bottom drawer (~80vh) with the same UI
- Tap a variant → drawer closes, variant added to the active form context (entry row or edit drawer)

## Architecture

### Files

**Kept as-is:**
- `src/app/admin/login/{page.tsx,LoginForm.tsx,actions.ts}` — login flow unchanged
- `src/lib/admin-session.ts`, `src/lib/medusa-admin.ts` — session + admin SDK singleton
- `src/proxy.ts` admin gate, `src/app/robots.ts` Disallow

**Rewritten:**
- `src/app/admin/orders/page.tsx` — server component: fetches initial 50 recent orders + filter defaults
- `src/app/admin/orders/components/AdminOrdersClient.tsx` — top-level client orchestrator (filter state, editing-row state, drafts)
- `src/app/admin/orders/components/RecentOrders.tsx` → renamed `RecentOrdersSheet.tsx` — sheet table on desktop, compact list on mobile, inline edit row state
- `src/app/admin/orders/components/OrderForm.tsx` → split into:
  - `useOrderForm.ts` (hook — shared form state used by entry row, inline edit, drawer)
  - `NewOrderRow.tsx` (desktop sheet row entry)
  - `OrderEditDrawer.tsx` (mobile drawer + heavy-edit fallback drawer)
  - `OrderRowFields.tsx` (cells used inline when ✏️ is clicked on a past row)

**Deleted:**
- `OrderRowActions.tsx` — superseded by inline-edit pencil flow
- `OrderForm.tsx` — split into the 4 files above (`useOrderForm.ts`, `NewOrderRow.tsx`, `OrderEditDrawer.tsx`, `OrderRowFields.tsx`)

**New:**
- `src/app/admin/orders/components/CustomerSearch.tsx` — search bar, dedup-by-phone result list, "Use customer" chip
- `src/app/admin/orders/components/DateFilter.tsx` — preset dropdown + custom range
- `src/app/admin/orders/components/VatBreakdown.tsx` — small caption shown below totals when payment = Juice
- `src/lib/use-media-query.ts` — tiny hook to swap behaviors at the `lg` breakpoint

### `src/lib/admin-orders.ts` extensions

Existing kept:
- `searchVariantsBySku(query, opts)`
- `createDmOrder(input)` — extended with `custom_notes`, `pseudo`, `email`, `tracking_number`, conditional `vat_amount` in metadata; "District" arg removed

New:
- `searchOrders({ query, dateFrom, dateTo, limit, offset })` — server-side filter; filters out replaced orders
- `searchCustomers(query)` — orders endpoint, deduped by phone client-side
- `updateOrderLight(orderId, patch)` — metadata + shipping_address patches via Medusa admin
- `editOrderHeavy(oldOrderId, input)` — pre-flight stock check, cancel old, create new, stamp metadata bidirectionally
- `getRecentOrders()` updated to filter out orders with `metadata.replaced_by_order_id` set

### `src/app/admin/orders/actions.ts` extensions

New server actions:
- `searchOrdersAction(filter)` — wraps `searchOrders`
- `searchCustomersAction(query)` — wraps `searchCustomers`
- `updateOrderAction(orderId, input)` — diffs old vs new, routes to `updateOrderLight` or `editOrderHeavy`

Existing extended:
- `createDmOrderAction(input)` — accepts new fields above

All mutations call `revalidatePath("/admin/orders")` on success.

### State management

- Plain `useState` + `useTransition` in `AdminOrdersClient`
- `useOrderForm` hook isolates field state shared between entry row and edit drawer
- Editing-row state: `{ orderId: string | null, draft: OrderInput }` in `AdminOrdersClient`
- No new state library

### Mobile detection

- `useMediaQuery("(min-width: 1024px)")` hook for behaviors that need JS (drawer vs inline edit)
- Tailwind responsive variants for layout (hidden/visible classes at `lg`)

### District removal

- Admin UI never collects District; field removed from `useOrderForm` defaults, from sheet columns, from the type for `createDmOrder` input
- Public checkout (`CheckoutForm.tsx`) and `MU_DISTRICTS` in `src/lib/checkout.ts` are untouched in this PR
- Follow-up PR (separate spec) removes District from `/checkout`

## Tech-specific gotchas

### Next.js 16
- All admin routes are Server Components by default; mark client components with `"use client"`
- Server actions: `"use server"` at top of `actions.ts`
- `searchParams` is `Promise<{...}>` in App Router pages
- `dynamic = "force-dynamic"` on `/admin/orders/page.tsx` so recent orders are always fresh
- Re-read `node_modules/next/dist/docs/01-app/...` before assuming any Next.js API behavior — v16 has breaking changes vs training data

### Medusa SDK admin auth
- `auth.login("user", "emailpass", {...})` with `jwtTokenStorageMethod: "memory"` — already in `medusa-admin.ts`; no change

### Medusa cancel + recreate atomicity
- Medusa does not provide a transactional cancel+create. We accept a brief inventory window during heavy edit (cancel returns stock, create decrements). For a solo founder with one device, race risk is negligible.
- Pre-flight stock check uses `inventory_quantity` from variant fetch at `STOCK_LOCATION_ID` so we refuse edits that would create negative stock before we touch anything

### Heavy edit failure recovery
- If create fails after cancel: the cancel persists (no auto-restore). UI shows error + Retry. The retry simply attempts the create again with the same payload.
- If even the retry fails repeatedly: the order is canceled and the user must recreate manually via the New Order entry — same path as today's "delete and re-enter" workflow

### VAT calculation precision
- VAT extraction: `vat_amount = Math.round(total * 15 / 115)` (integer MUR, no cents)
- This ensures VAT is exactly extracted from the VAT-inclusive total (15% of net = 13.04% of gross)

### Sticky stock checker
- `position: sticky; top: <toolbar height>` on the right column card
- On scroll, card stays visible until the user scrolls past the bottom of the page

### Horizontal scroll containment
- The Recent Orders table has `overflow-x: auto` on its wrapper so horizontal scroll happens *inside* the table, not at the page level
- New Order entry row uses the same column widths/grid so it visually aligns with the table below
- Page-level grid: `grid-cols-[1fr_300px]` on desktop, single column on mobile

## Acceptance

A Doll Up DM customer messages on Instagram. Founder opens `/admin/orders` on her phone:
- Types the SKU into the Stock Checker (📦 button → drawer) → sees stock availability
- Replies to the DM
- Switches to the entry form (stacked on phone), fills delivery date, way, name, city, phone, picks the product, picks payment method
- Hits Save → order appears in Recent Orders list, inventory decremented
- Later that evening, on desktop:
  - Sees today's orders in sheet view
  - Realizes she charged the wrong price on order #1232 → clicks ✏️ → cell becomes editable → fixes the unit price → Save → heavy edit triggers cancel+recreate, new order #1242 replaces #1232, "↻ replaces #1232" caption shows beneath the new ID
  - Searches "Ben" → sees Ben's 3 prior orders → clicks "📋 Use customer in new entry" → entry row pre-fills with Ben's name + phone + address
  - Filters by "Today" → sees today's session
  - Marks an old order as Delivered (light edit, instant)

Total session time per order: ≤ 90 seconds. Total time per typo edit: ≤ 30 seconds.

## File index (sanity check)

New files (8):
- `src/app/admin/orders/components/CustomerSearch.tsx`
- `src/app/admin/orders/components/DateFilter.tsx`
- `src/app/admin/orders/components/VatBreakdown.tsx`
- `src/app/admin/orders/components/NewOrderRow.tsx` (carved out of `OrderForm.tsx`)
- `src/app/admin/orders/components/OrderEditDrawer.tsx` (carved out of `OrderForm.tsx`)
- `src/app/admin/orders/components/OrderRowFields.tsx` (carved out of `OrderForm.tsx`)
- `src/app/admin/orders/components/useOrderForm.ts` (carved out of `OrderForm.tsx`)
- `src/lib/use-media-query.ts`

Rewritten in place (2):
- `src/app/admin/orders/page.tsx`
- `src/app/admin/orders/components/AdminOrdersClient.tsx`

Renamed + rewritten (1):
- `src/app/admin/orders/components/RecentOrders.tsx` → `RecentOrdersSheet.tsx`

Extended (2):
- `src/app/admin/orders/actions.ts`
- `src/lib/admin-orders.ts`

Deleted (2):
- `src/app/admin/orders/components/OrderRowActions.tsx` (superseded by inline edit)
- `src/app/admin/orders/components/OrderForm.tsx` (split into the 4 carved-out files above)

Net: 8 new, 2 rewrites, 1 rename+rewrite, 2 extensions, 2 deletions. Estimated ~800–1100 LOC of net change.

## Don't do these things

- Don't introduce a state library (Zustand, Redux, etc.) — `useState` + `useTransition` is sufficient
- Don't add Jest/Playwright — verification is `tsc --noEmit` + `next build` + manual browser smoke
- Don't introduce new Tailwind colors — use existing `coral-*`, `blush-*`, `cream`, `ink*`
- Don't add a customer-record dedupe in Medusa — autofill just copies values, each save creates fresh shipping_address
- Don't try to use Medusa Order Edits API — B2 cancel-recreate was chosen for simplicity
- Don't email order confirmations
- Don't sync to/from Google Sheet — the Sheet is being retired
- Don't remove District from public `/checkout` in this PR — separate spec
- Don't change the login flow / proxy / session — those work
