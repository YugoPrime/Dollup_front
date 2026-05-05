# DM Admin — Prep Page Design Spec

**Date:** 2026-05-05
**Author:** founder + Claude
**Builds on:** `2026-05-05-dm-admin-orders-v2-design.md`

## Problem

`/admin/orders` is the data-entry sheet — fast row-based capture of incoming DM orders. It is not the right tool for **physically preparing** the orders: bagging products, attaching shipping labels, handing off to courier, marking what's ready to leave the studio.

Daily prep workflow today is mental — the founder scrolls Recent Orders, opens each row, mentally picks today's deliveries, packs them, then has no place to mark "this one is ready to leave." Tracking numbers for La Poste shipments get added late or forgotten.

## Goal

A separate, mobile-first page `/admin/prep` that shows **only orders awaiting preparation for a chosen day**, grouped by delivery method, with product thumbnails and a single "ready" action per order.

## Non-goals

- Replacing `/admin/orders`. The data-entry sheet stays.
- Editing order contents from the prep page. Edits happen on the order list.
- Customer notifications. Out of scope.

## Status state machine

A new metadata field `metadata.dm_status` carries the workflow status. Combined with Medusa-native `status` and `fulfillment_status`, it produces an **effective status** the UI displays.

| dm_status (metadata) | Medusa status | Medusa fulfillment | Effective UI status |
|---|---|---|---|
| `preparation` (default) | pending | not_fulfilled | **Preparation** |
| `ready` | pending | not_fulfilled | **Ready** |
| any | canceled | any | **Cancelled** |
| any | pending | fulfilled | **Delivered** |

Resolution priority: `Cancelled > Delivered > Ready > Preparation`.

### Per-method action mapping (the prep page checkbox)

| Tab | Action label | Writes |
|---|---|---|
| BY POST (Postage / Express Postage / Rodrigues Postage) | "Mark Shipped" | `dm_status='ready'` AND `markOrderFulfilled()` |
| Home Delivery | "Mark Ready" | `dm_status='ready'` |
| Pick Up | "Mark Ready" | `dm_status='ready'` |

Why: BY POST handoff is final the moment the founder drops the parcels at La Poste — there's no later "delivered" event she'll see. For Home Delivery and Pick Up, "Ready" means *bag is packed and labeled*; the actual delivery / handoff is later, marked manually from the order list.

### Manual transition: Ready → Delivered (order list)

Already supported by `updateOrderLight({ status: 'delivered' })`. We extend the Status dropdown in `OrderEditDrawer.tsx` to include `Ready` (writes `dm_status='ready'`) so the operator can also flip it from the order list when needed.

### Backwards compatibility

Existing orders have no `metadata.dm_status`. `mapOrder` defaults missing values to `preparation`. They show up on the prep page if they have a future / today `delivery_date`. Cancelled and fulfilled old orders correctly resolve to Cancelled / Delivered via priority. No backfill needed.

### Tracking gate

Not blocking. BY POST orders can be marked Shipped without a tracking number — the founder enters tracking later from the order list. We show a warning hint on cards that lack tracking, but the action is allowed.

## Page architecture

```
/admin/prep
  ├── Date picker  (defaults to today, MU UTC+4)
  └── Tabs:  [ BY POST ]  [ Home Delivery ]  [ Pick Up ]
       └── Per-order card list (mobile-first, large tap targets)
              ├── Customer: name + phone
              ├── Address: city + address_1 (all tabs, including Pick Up)
              ├── Products: thumbnail | title | size/variant | qty
              ├── Custom notes (if any)
              ├── Tracking input  (BY POST only, when empty — warns but does not block)
              └── Action button: "Mark Ready" / "Mark Shipped"
```

### Filter logic

Server fetches the last 60 days of orders (same field selector as `searchOrders` plus `items.thumbnail` and `items.variant.title`). Client-side filters by:
1. `dmStatus === 'preparation'`
2. `deliveryDate === selectedDay` (or no `delivery_date` set → falls into Today's bucket)
3. Tab match (`deliveryMethod ∈ tab's set`)
4. Not replaced and not cancelled (already handled by `mapOrder` filtering, but reapply for clarity)

Sort within each tab: `deliveryDate asc, createdAt asc` (oldest first, prep order matches arrival order).

### Empty states

Each tab shows: *"No [Way] orders to prep for [date]."*

## Files

**New:**
- `src/app/admin/prep/page.tsx` — server shell, auth gate, initial data load
- `src/app/admin/prep/components/AdminPrepClient.tsx` — date picker + tabs + list orchestrator
- `src/app/admin/prep/components/PrepOrderCard.tsx` — single-order card
- `src/app/admin/prep/actions.ts` — `markReadyAction(orderId)`, `markShippedAction(orderId)`, `setTrackingAction(orderId, trackingNumber)`

**Modified:**
- `src/lib/admin-orders.ts` — add `DmStatus` type, `OrderRow.dmStatus` field, `getPrepOrders()`, `markOrderReady()`, `markOrderShipped()`, write `dm_status='preparation'` in `createDmOrder`, extend `OrderLightPatch.status` to include `'ready'`
- `src/lib/admin-orders.ts` — extend `mapOrder` to read `dm_status` and item thumbnails; expose `getEffectiveStatus(row)` helper
- `src/app/admin/orders/components/OrderEditDrawer.tsx` — add "Ready" to Status dropdown
- `src/app/admin/orders/components/RecentOrdersSheet.tsx` — Status badge uses `getEffectiveStatus`
- `src/app/admin/orders/components/useOrderForm.ts` — handle the new `'ready'` status round-trip
- Header navigation (admin) — link to `/admin/prep`

## Data shape additions

```ts
// src/lib/admin-orders.ts

export type DmStatus = 'preparation' | 'ready';

export type EffectiveStatus = 'preparation' | 'ready' | 'delivered' | 'cancelled';

// added to OrderRow
dmStatus: DmStatus; // defaults to 'preparation' if metadata absent
items: {
  // ...existing fields
  thumbnail: string | null;       // new — from variant.product.thumbnail or item.thumbnail
  variantTitle: string | null;    // new — size / shade label
}[];

export function getEffectiveStatus(row: OrderRow): EffectiveStatus {
  if (row.status === 'canceled') return 'cancelled';
  if (row.fulfillmentStatus === 'fulfilled') return 'delivered';
  return row.dmStatus; // 'ready' or 'preparation'
}
```

The `OrderLightPatch.status` discriminator widens:

```ts
status?: 'delivered' | 'cancelled' | 'pending' | 'ready' | 'preparation';
```

`updateOrderLight` extends:
- `status === 'ready'` → write `metadata.dm_status='ready'`
- `status === 'preparation'` → write `metadata.dm_status='preparation'`
- existing `'delivered'` and `'cancelled'` paths unchanged

## Mobile design notes

- Cards stack vertically full-width on mobile, 2-up grid at lg+.
- Thumbnails 64×64 on mobile, 80×80 on desktop. `object-cover`, rounded.
- Tap target on action button: min 48px height, full card width on mobile.
- Sticky tab bar at top so scrolling a long list keeps tabs reachable.
- Date picker collapses to a chip showing the selected date; tap opens a native `<input type="date">`.

## Verification

- `tsc --noEmit` clean
- `npm run build` clean
- Manual smoke:
  - Create a DM order with delivery_date = today and Postage → appears on BY POST tab
  - Click "Mark Shipped" → order disappears from prep page; Recent Orders shows status "Delivered" and Medusa admin shows fulfillment created
  - Create a Home Delivery order for today → appears on Home Delivery tab
  - Click "Mark Ready" → disappears from prep page; Recent Orders shows status "Ready"
  - From Recent Orders edit drawer, flip Ready → Delivered → status updates, fulfillment created in Medusa admin
  - Empty BY POST tab on a date with no postage orders → empty state copy renders
  - Mobile viewport (375px) — cards readable, button reachable, tabs sticky
  - Old fulfilled order (no `dm_status`) shows "Delivered" badge (not "Preparation")

## Out of scope (deferred)

- Bulk "mark all in tab as ready" button — wait until volume justifies it.
- Print labels / pack slips from prep page.
- Push notifications when an order is created with delivery_date = today.
- Sheet backup cron — separate workstream (n8n).
- Move admin to `admin.dollupboutique.com` subdomain — separate workstream.
