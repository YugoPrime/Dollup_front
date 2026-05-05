# DM Admin — Prep Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/admin/prep` page that lets the founder physically prepare orders day-by-day, grouped by delivery method, with one-tap "Ready" / "Shipped" actions and a per-method status state machine.

**Architecture:** Mobile-first new admin route. Status state machine layered onto a new `metadata.dm_status` field, joined with Medusa-native `status` and `fulfillment_status` via a `getEffectiveStatus()` resolver. Server fetches a 60-day window and filters in memory by dm_status + delivery_date + delivery_method (Medusa SDK can't filter by metadata).

**Tech Stack:** Next.js 16 App Router (server + client components), Medusa admin SDK, Tailwind v4, server actions for mutations.

**Spec:** `DUB-front/docs/superpowers/specs/2026-05-05-dm-admin-prep-page.md`

---

## Slice 1 — `dm_status` foundation + default on create

Add the metadata-backed status field. Reads default to `preparation`, writes happen in `createDmOrder` and via two new server functions. No UI changes yet.

**Files:**
- Modify: `DUB-front/src/lib/admin-orders.ts` (add `DmStatus`, `EffectiveStatus`, `getEffectiveStatus`; extend `OrderRow` with `dmStatus`, items with `thumbnail` + `variantTitle`; write `dm_status='preparation'` in `createDmOrder`'s metadata block; add `markOrderReady`, `markOrderShipped`, extend field selectors with `items.thumbnail,items.variant.title`; widen `OrderLightPatch.status` and handle the new variants in `updateOrderLight`)

- [ ] **Step 1: Extend types and resolver**

In `admin-orders.ts`, after the existing `OrderRow` type:

```ts
export type DmStatus = "preparation" | "ready";
export type EffectiveStatus = "preparation" | "ready" | "delivered" | "cancelled";

export function getEffectiveStatus(row: OrderRow): EffectiveStatus {
  if (row.status === "canceled") return "cancelled";
  if (row.fulfillmentStatus === "fulfilled") return "delivered";
  return row.dmStatus;
}
```

Add to `OrderRow`:

```ts
dmStatus: DmStatus;
```

Extend `OrderRow.items` element shape:

```ts
items: {
  id: string;
  variantId: string | null;
  sku: string | null;
  title: string;
  variantTitle: string | null;  // new
  thumbnail: string | null;     // new
  quantity: number;
  unitPriceMur: number;
}[];
```

- [ ] **Step 2: Read dm_status + thumbnails in mapOrder**

Replace the items map in `mapOrder` (around line 211):

```ts
items: (o.items ?? []).map((it) => {
  const itAny = it as unknown as {
    variant_sku?: string | null;
    variant_title?: string | null;
    thumbnail?: string | null;
    variant?: { title?: string | null } | null;
  };
  return {
    id: it.id,
    variantId: it.variant_id ?? null,
    sku: typeof itAny.variant_sku === "string" ? itAny.variant_sku : null,
    title: it.product_title ?? it.title ?? "Item",
    variantTitle:
      itAny.variant?.title ??
      (typeof itAny.variant_title === "string" ? itAny.variant_title : null),
    thumbnail: typeof itAny.thumbnail === "string" ? itAny.thumbnail : null,
    quantity: it.quantity,
    unitPriceMur: Math.round(Number(it.unit_price ?? 0)),
  };
}),
```

In the `return` of `mapOrder`, add:

```ts
dmStatus: ((): DmStatus => {
  const v = meta.dm_status;
  return v === "ready" ? "ready" : "preparation";
})(),
```

- [ ] **Step 3: Write `dm_status='preparation'` on create**

In `createDmOrder`, in the metadata block (around line 495), add immediately after `source: "dm_admin"`:

```ts
dm_status: "preparation",
```

- [ ] **Step 4: Extend field selectors**

Both `getRecentOrders` and `searchOrders` use:

```ts
fields:
  "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,*shipping_address,*shipping_methods",
```

Replace with:

```ts
fields:
  "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,items.thumbnail,items.variant.title,*shipping_address,*shipping_methods",
```

- [ ] **Step 5: Add markOrderReady + markOrderShipped**

After `markOrderFulfilled` (around line 640), add:

```ts
export async function markOrderReady(orderId: string): Promise<void> {
  const sdk = await getAdminSdk();
  const { order } = await sdk.admin.order.retrieve(orderId, {
    fields: "id,metadata",
  });
  const meta = { ...(order.metadata ?? {}) } as Record<string, unknown>;
  meta.dm_status = "ready";
  await sdk.admin.order.update(orderId, { metadata: meta });
}

export async function markOrderShipped(orderId: string): Promise<void> {
  await markOrderReady(orderId);
  await markOrderFulfilled(orderId);
}
```

- [ ] **Step 6: Extend updateOrderLight to handle ready / preparation**

Widen `OrderLightPatch.status`:

```ts
status?: "delivered" | "cancelled" | "pending" | "ready" | "preparation";
```

Replace the status-handling block at the end of `updateOrderLight` (lines 762-768) with:

```ts
if (patch.status === "cancelled") {
  await sdk.admin.order.cancel(orderId);
} else if (patch.status === "delivered") {
  await markOrderFulfilled(orderId);
} else if (patch.status === "ready") {
  await markOrderReady(orderId);
} else if (patch.status === "preparation") {
  // Roll back to preparation: clear ready flag. Cannot un-cancel or un-fulfill.
  const { order } = await sdk.admin.order.retrieve(orderId, {
    fields: "id,metadata",
  });
  const meta = { ...(order.metadata ?? {}) } as Record<string, unknown>;
  meta.dm_status = "preparation";
  await sdk.admin.order.update(orderId, { metadata: meta });
}
```

- [ ] **Step 7: Verify build**

```
cd DUB-front
npx tsc --noEmit
npm run build
```

Expected: clean. If `items.variant.title` selector errors, fall back to `*items,items.thumbnail` and accept `variantTitle: null` (the variant_title field on a line item is sometimes auto-populated by Medusa and visible without nesting).

- [ ] **Step 8: Commit**

```bash
git add DUB-front/src/lib/admin-orders.ts
git commit -m "feat(admin): add dm_status metadata field + read/write helpers"
```

---

## Slice 2 — Effective status everywhere on the order list

Apply `getEffectiveStatus` in the Recent Orders sheet so the Status column shows Preparation / Ready / Delivered / Cancelled. Add Ready and Preparation to the order edit drawer's status dropdown.

**Files:**
- Modify: `DUB-front/src/app/admin/orders/components/RecentOrdersSheet.tsx` — replace status badge logic with `getEffectiveStatus`
- Modify: `DUB-front/src/app/admin/orders/components/OrderEditDrawer.tsx` — extend Status dropdown to include Ready and Preparation
- Modify: `DUB-front/src/app/admin/orders/components/useOrderForm.ts` — round-trip the new status values
- Modify: `DUB-front/src/app/admin/orders/components/NewOrderRow.tsx` if a Status field is exposed there (verify first)

- [ ] **Step 1: Read current status badge logic**

```
Read DUB-front/src/app/admin/orders/components/RecentOrdersSheet.tsx
Read DUB-front/src/app/admin/orders/components/OrderEditDrawer.tsx
Read DUB-front/src/app/admin/orders/components/useOrderForm.ts
```

Identify how today's badge / dropdown maps the status values.

- [ ] **Step 2: Wire `getEffectiveStatus` into RecentOrdersSheet**

Import:

```ts
import { getEffectiveStatus } from "@/lib/admin-orders";
```

Replace the Status badge expression that today reads `o.status` / `fulfillmentStatus` with:

```tsx
const eff = getEffectiveStatus(o);
const label = eff === "preparation" ? "Preparation"
  : eff === "ready" ? "Ready"
  : eff === "delivered" ? "Delivered"
  : "Cancelled";
const tone = eff === "cancelled" ? "bg-red-100 text-red-700"
  : eff === "delivered" ? "bg-green-100 text-green-700"
  : eff === "ready" ? "bg-blue-100 text-blue-700"
  : "bg-amber-100 text-amber-700"; // preparation
```

Render:

```tsx
<span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
  {label}
</span>
```

- [ ] **Step 3: Extend Status dropdown in OrderEditDrawer**

In the Status select, add options:

```tsx
<option value="">— Preparation</option>     {/* unchanged baseline */}
<option value="ready">Ready</option>
<option value="delivered">Delivered</option>
<option value="cancelled">Cancelled</option>
```

(Preparation is the empty-string default; the form already treats empty as no patch / preparation.)

- [ ] **Step 4: Update useOrderForm round-trip**

In `hydrateOrderToForm`, set the form's `status` field from the row:

```ts
const eff = getEffectiveStatus(row);
status: eff === "preparation" ? undefined : eff,
```

In the form's `toCreateInput`, the existing path that maps form.status → input.status now needs to pass `'ready'` and `'preparation'` through — confirm the input type allows them. If the form input type is narrower than `OrderLightPatch.status`, widen it to match.

- [ ] **Step 5: Verify build + visual smoke**

```
npx tsc --noEmit
npm run dev
```

Open `/admin/orders`. New orders should display "Preparation" badge. Open an order edit drawer — Status dropdown should show four options.

- [ ] **Step 6: Commit**

```bash
git add DUB-front/src/app/admin/orders/components/
git commit -m "feat(admin): show effective status on order list, add Ready/Preparation dropdown"
```

---

## Slice 3 — Prep data fetcher

Server function to load the prep window and filter it.

**Files:**
- Modify: `DUB-front/src/lib/admin-orders.ts` — add `getPrepOrders(date, way?)` and `WAY_BUCKETS` map
- Modify: `DUB-front/src/lib/checkout.ts` only if `DM_DELIVERY_METHODS` needs an explicit grouping helper (likely just exported here in `admin-orders.ts`)

- [ ] **Step 1: Add tab grouping**

In `admin-orders.ts`:

```ts
export type PrepTab = "by_post" | "home_delivery" | "pick_up";

export const WAY_BUCKETS: Record<PrepTab, readonly DmDeliveryMethod[]> = {
  by_post: ["Postage", "Express Postage", "Rodrigues Postage"],
  home_delivery: ["Home Delivery"],
  pick_up: ["Pick Up"],
};
```

- [ ] **Step 2: Add getPrepOrders**

```ts
/**
 * Fetch orders that need prep on `date`. Filters in memory because the
 * Medusa admin SDK does not support metadata-keyed list filters.
 *
 * @param date  yyyy-mm-dd in MU local time (UTC+4, no DST)
 * @param tab   optional — when provided, returns only orders in that tab's bucket
 */
export async function getPrepOrders(
  date: string,
  tab?: PrepTab,
): Promise<OrderRow[]> {
  const sdk = await getAdminSdk();
  // 60-day window upstream of `date` covers anything realistically still in prep.
  const dateObj = new Date(`${date}T12:00:00${MU_OFFSET}`);
  const fromObj = new Date(dateObj.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fromIso = fromObj.toISOString().slice(0, 10);

  const params: Record<string, unknown> = {
    limit: 200,
    order: "-created_at",
    fields:
      "id,display_id,created_at,email,total,payment_status,fulfillment_status,status,metadata,*items,items.thumbnail,items.variant.title,*shipping_address,*shipping_methods",
    created_at: {
      $gte: `${fromIso}T00:00:00.000${MU_OFFSET}`,
      $lte: `${date}T23:59:59.999${MU_OFFSET}`,
    },
  };
  const res = await sdk.admin.order.list(
    params as Parameters<typeof sdk.admin.order.list>[0],
  );
  const all = (res.orders as HttpTypes.AdminOrder[]).map(mapOrder);
  const allowedWays = tab
    ? new Set<string>(WAY_BUCKETS[tab])
    : null;
  return all
    .filter((o) => o.replacedByOrderId == null)
    .filter((o) => o.status !== "canceled" && o.fulfillmentStatus !== "fulfilled")
    .filter((o) => o.dmStatus === "preparation")
    .filter((o) => {
      // Match the chosen day. Orders with no delivery_date fall through to today's bucket only.
      if (!o.deliveryDate) return date === todayMauritius();
      return o.deliveryDate === date;
    })
    .filter((o) => {
      if (!allowedWays) return true;
      return o.deliveryMethod ? allowedWays.has(o.deliveryMethod) : false;
    })
    .sort((a, b) => {
      const da = a.deliveryDate ?? a.createdAt;
      const db = b.deliveryDate ?? b.createdAt;
      if (da !== db) return da.localeCompare(db);
      return a.createdAt.localeCompare(b.createdAt);
    });
}

function todayMauritius(): string {
  // MU is UTC+4 fixed. Convert now → MU calendar day (yyyy-mm-dd).
  const now = new Date();
  const muMs = now.getTime() + 4 * 60 * 60 * 1000;
  return new Date(muMs).toISOString().slice(0, 10);
}
```

- [ ] **Step 3: Verify**

```
npx tsc --noEmit
```

Expected: clean. (No UI yet; smoke comes after Slice 5.)

- [ ] **Step 4: Commit**

```bash
git add DUB-front/src/lib/admin-orders.ts
git commit -m "feat(admin): add getPrepOrders + tab buckets"
```

---

## Slice 4 — `/admin/prep` page shell + tabs

Auth-gated route, date picker, three tabs, no data wired yet (skeleton).

**Files:**
- Create: `DUB-front/src/app/admin/prep/page.tsx`
- Create: `DUB-front/src/app/admin/prep/components/AdminPrepClient.tsx`
- Create: `DUB-front/src/app/admin/prep/actions.ts` (just `getPrepOrdersAction` for now)

- [ ] **Step 1: Page shell**

`DUB-front/src/app/admin/prep/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getPrepOrders } from "@/lib/admin-orders";
import { AdminPrepClient } from "./components/AdminPrepClient";

export const dynamic = "force-dynamic";

export default async function AdminPrepPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?next=/admin/prep");

  const today = new Date().toISOString().slice(0, 10);
  const initialOrders = await getPrepOrders(today);

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 lg:py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Prep</h1>
        <a href="/admin/orders" className="text-sm text-coral-700 underline">
          → Orders
        </a>
      </header>
      <AdminPrepClient initialDate={today} initialOrders={initialOrders} />
    </main>
  );
}
```

(Confirm `getAdminSession` is the helper used in `/admin/orders/page.tsx` — read that file first to mirror its auth pattern exactly.)

- [ ] **Step 2: Client orchestrator (skeleton)**

`DUB-front/src/app/admin/prep/components/AdminPrepClient.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import type { OrderRow, PrepTab } from "@/lib/admin-orders";
import { reloadPrepOrdersAction } from "../actions";

const TABS: { id: PrepTab; label: string }[] = [
  { id: "by_post", label: "By Post" },
  { id: "home_delivery", label: "Home Delivery" },
  { id: "pick_up", label: "Pick Up" },
];

const WAY_TO_TAB: Record<string, PrepTab> = {
  Postage: "by_post",
  "Express Postage": "by_post",
  "Rodrigues Postage": "by_post",
  "Home Delivery": "home_delivery",
  "Pick Up": "pick_up",
};

export function AdminPrepClient({
  initialDate,
  initialOrders,
}: {
  initialDate: string;
  initialOrders: OrderRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<PrepTab>("by_post");
  const [isPending, startTransition] = useTransition();

  const visible = orders.filter(
    (o) => o.deliveryMethod && WAY_TO_TAB[o.deliveryMethod] === tab,
  );

  function handleDateChange(next: string) {
    setDate(next);
    startTransition(async () => {
      const fresh = await reloadPrepOrdersAction(next);
      setOrders(fresh);
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-ink-muted">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded border border-ink-soft/40 px-2 py-1 text-sm"
        />
        {isPending && <span className="text-xs text-ink-muted">Loading…</span>}
      </div>

      <nav className="sticky top-0 z-10 -mx-3 mb-4 flex gap-1 border-b border-ink-soft/20 bg-cream/95 px-3 py-2 backdrop-blur">
        {TABS.map((t) => {
          const count = orders.filter(
            (o) => o.deliveryMethod && WAY_TO_TAB[o.deliveryMethod] === t.id,
          ).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? "bg-ink text-cream"
                  : "bg-blush-100 text-ink-muted"
              }`}
            >
              {t.label} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-soft/30 px-6 py-12 text-center text-sm text-ink-muted">
          No {TABS.find((t) => t.id === tab)?.label.toLowerCase()} orders to prep for {date}.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-ink-soft/20 bg-white p-4 text-sm"
            >
              <div className="font-medium">#{o.displayId} — {o.buyerName}</div>
              <div className="text-ink-muted">{o.deliveryMethod}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 3: Reload action**

`DUB-front/src/app/admin/prep/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import {
  getPrepOrders,
  markOrderReady,
  markOrderShipped,
  updateOrderLight,
  type OrderRow,
} from "@/lib/admin-orders";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
}

export async function reloadPrepOrdersAction(date: string): Promise<OrderRow[]> {
  await requireAdmin();
  return getPrepOrders(date);
}

export async function markReadyAction(orderId: string): Promise<void> {
  await requireAdmin();
  await markOrderReady(orderId);
}

export async function markShippedAction(orderId: string): Promise<void> {
  await requireAdmin();
  await markOrderShipped(orderId);
}

export async function setTrackingAction(
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  await requireAdmin();
  await updateOrderLight(orderId, {
    trackingNumber: trackingNumber.trim() || null,
  });
}
```

- [ ] **Step 4: Add Prep link to admin nav**

If `/admin/orders/page.tsx` (or a shared admin layout / header) renders top-bar links, add a link to `/admin/prep`. Otherwise, the cross-link inside the page header is enough for now.

- [ ] **Step 5: Verify build + visual smoke**

```
npx tsc --noEmit
npm run dev
```

Open `/admin/prep`. Page should render, date picker should default to today, three tabs should show counts, switching tabs filters the placeholder list. Counts should match the orders matching today's delivery_date.

- [ ] **Step 6: Commit**

```bash
git add DUB-front/src/app/admin/prep/
git commit -m "feat(admin): /admin/prep route shell with date picker and tabs"
```

---

## Slice 5 — `PrepOrderCard` with thumbnails + actions

Replace the placeholder `<li>` with a real card: customer/address block, products with thumbnails, optional tracking input, action button.

**Files:**
- Create: `DUB-front/src/app/admin/prep/components/PrepOrderCard.tsx`
- Modify: `DUB-front/src/app/admin/prep/components/AdminPrepClient.tsx` — render `PrepOrderCard`

- [ ] **Step 1: Build the card**

`DUB-front/src/app/admin/prep/components/PrepOrderCard.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { OrderRow, PrepTab } from "@/lib/admin-orders";
import {
  markReadyAction,
  markShippedAction,
  setTrackingAction,
} from "../actions";

const BY_POST_TAB: PrepTab = "by_post";

export function PrepOrderCard({
  order,
  tab,
  onDone,
}: {
  order: OrderRow;
  tab: PrepTab;
  onDone: (orderId: string) => void;
}) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isByPost = tab === BY_POST_TAB;
  const actionLabel = isByPost ? "Mark Shipped" : "Mark Ready";
  const showTracking = isByPost;
  const lacksTracking = isByPost && !tracking.trim();

  function handleAction() {
    setError(null);
    startTransition(async () => {
      try {
        if (isByPost && tracking.trim() !== (order.trackingNumber ?? "")) {
          await setTrackingAction(order.id, tracking);
        }
        if (isByPost) await markShippedAction(order.id);
        else await markReadyAction(order.id);
        onDone(order.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const realItems = order.items.filter(
    (i) =>
      !/^Delivery — /.test(i.title) &&
      i.title !== "Discount" &&
      i.title !== "Adjustment",
  );

  return (
    <article className="rounded-lg border border-ink-soft/20 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-lg leading-tight text-ink">
            #{order.displayId} — {order.buyerName || "—"}
          </div>
          <div className="text-xs text-ink-muted">{order.deliveryMethod}</div>
        </div>
        <a
          href={`tel:${order.phone ?? ""}`}
          className="text-sm text-coral-700 underline whitespace-nowrap"
        >
          {order.phone ?? "—"}
        </a>
      </header>

      <div className="mb-3 rounded bg-blush-100/40 px-3 py-2 text-sm leading-snug">
        <div className="font-medium">{order.city ?? "—"}</div>
        {order.addressDetails && order.addressDetails !== order.city && (
          <div className="text-ink-muted">{order.addressDetails}</div>
        )}
      </div>

      {order.customNotes && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {order.customNotes}
        </p>
      )}

      <ul className="mb-3 grid gap-2">
        {realItems.map((it) => (
          <li key={it.id} className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-blush-100">
              {it.thumbnail && (
                <Image
                  src={it.thumbnail}
                  alt={it.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium text-ink">{it.title}</div>
              <div className="text-xs text-ink-muted">
                {it.variantTitle ?? it.sku ?? ""}
                {it.variantTitle && it.sku ? ` · ${it.sku}` : ""}
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums">×{it.quantity}</div>
          </li>
        ))}
      </ul>

      {showTracking && (
        <label className="mb-3 block text-xs text-ink-muted">
          Tracking number
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="optional — can be added later"
            className="mt-1 block w-full rounded border border-ink-soft/30 px-2 py-1.5 text-sm"
          />
        </label>
      )}

      {error && (
        <p className="mb-2 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={handleAction}
        disabled={isSaving}
        className="w-full rounded-md bg-ink py-3 text-sm font-semibold text-cream disabled:opacity-50"
      >
        {isSaving ? "Saving…" : actionLabel}
        {lacksTracking && !isSaving && (
          <span className="ml-2 text-xs font-normal opacity-70">
            (no tracking)
          </span>
        )}
      </button>
    </article>
  );
}
```

- [ ] **Step 2: Wire into AdminPrepClient**

In `AdminPrepClient.tsx`, replace the placeholder `<li>` block with:

```tsx
import { PrepOrderCard } from "./PrepOrderCard";

// ...inside the visible.length > 0 branch:
<ul className="grid gap-3 lg:grid-cols-2">
  {visible.map((o) => (
    <li key={o.id}>
      <PrepOrderCard
        order={o}
        tab={tab}
        onDone={(id) => setOrders((prev) => prev.filter((x) => x.id !== id))}
      />
    </li>
  ))}
</ul>
```

- [ ] **Step 3: Image domain check**

If `next.config.ts` `remotePatterns` already covers Medusa / R2 hostnames (per CLAUDE.md it does), thumbnails should render. If a 4xx fires, the thumbnail URL is from a host not in `remotePatterns` — extend `next.config.ts`.

- [ ] **Step 4: Verify build + visual smoke**

```
npx tsc --noEmit
npm run dev
```

`/admin/prep` should now render full cards with thumbnails. Click "Mark Ready" or "Mark Shipped" — order disappears from the prep list (optimistic via `onDone`). Cross-check `/admin/orders` Status column: now shows Ready or Delivered respectively. Cross-check Medusa admin: BY POST orders show a fulfillment created.

- [ ] **Step 5: Commit**

```bash
git add DUB-front/src/app/admin/prep/components/
git commit -m "feat(admin): prep order cards with thumbnails and ready/shipped actions"
```

---

## Slice 6 — Polish + smoke matrix

- [ ] **Step 1: Mobile layout pass**

Open `/admin/prep` at 375px viewport. Verify:
- Cards stack full-width
- Tab bar sticks to top while scrolling
- Action button reaches min 48px height
- Thumbnails are 64px square and not cropped weirdly
- Tracking input is full-width and easy to tap

Adjust any tap target or spacing issue inline.

- [ ] **Step 2: Empty-state and edge-case smoke**

Verify each:
- Pick a future date with no orders → all three tabs show empty state
- Pick a date that's the founder's busy day → counts are correct
- Order with no `delivery_date` set on a non-today date → does NOT show on prep page (intentional; assumes today bucket only)
- Order with no products (manual line only) → card still renders, no thumbnail
- Cancelled order → never shows on prep (filter in `getPrepOrders`)
- Order with `dm_status='ready'` → does NOT show on prep (only `preparation` shows)
- Old order without `dm_status` metadata → defaults to preparation, shows on prep IF delivery_date matches

- [ ] **Step 3: Order list reverse-flip**

In `/admin/orders`, open an order that's currently Ready. In the edit drawer, change Status → Delivered → Save. Order's effective status should flip; Medusa admin should show fulfillment created.

In edit drawer, change Status → Preparation → Save. Order's `dm_status` flips back; Recent Orders Status badge says "Preparation" (this lets the founder push an order back if she marked Ready by mistake).

- [ ] **Step 4: Final type + build check**

```
npx tsc --noEmit
npm run build
```

Both clean. Build should generate the new `/admin/prep` route.

- [ ] **Step 5: Commit polish + browser-smoke fixes**

Group any tweaks from steps 1-3 into a single commit:

```bash
git add DUB-front/src/app/admin/prep/ DUB-front/src/lib/admin-orders.ts
git commit -m "polish(admin): prep page mobile spacing, edge-case fixes"
```

- [ ] **Step 6: Push when ready**

After live browser smoke passes (separate Claude Desktop session likely):

```bash
git push origin master
```

---

## Open follow-ups (NOT in this plan)

- Nightly Sheet backup via n8n (separate workstream)
- Move admin to `admin.dollupboutique.com` subdomain
- Bulk "mark all ready" on prep tab (defer until volume justifies it)
- Push notification when an order created with delivery_date = today
