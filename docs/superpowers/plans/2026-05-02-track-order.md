# Track Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customer-facing `/track-order` page that looks up an order by order number + phone and shows a 5-step delivery timeline with a slot for a Mauritius Post tracking code.

**Architecture:** A Next.js Route Handler at `/api/track-order` accepts `{ orderRef, phone }`, calls Medusa's Store API server-side, normalizes the phone, and returns a sanitized `TrackOrderResponse`. A client page renders the form, calls the route handler, and shows a status badge + timeline + recap on success. Tracking code surfaces from `order.metadata.tracking_code` (Store API does not expose fulfillment labels, so admin sets it as metadata).

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript 5, Tailwind v4 (existing tokens), `@medusajs/js-sdk@2.14.1`. No test framework — verification is `npx tsc --noEmit`, `npm run build`, manual browser smoke (per `CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-05-02-track-order-design.md`

---

## File Map

| File | Purpose | Action |
|---|---|---|
| `src/lib/track-order.ts` | Phone normalization, order-ref parsing, status mapping, response type, tracking-URL builder | **Create** |
| `src/app/api/track-order/route.ts` | `POST` handler — looks up order, validates phone, returns sanitized response | **Create** |
| `src/app/track-order/page.tsx` | Client page — orchestrates form, result, error banner; handles `?order=` pre-fill | **Create** |
| `src/app/track-order/TrackOrderForm.tsx` | Order-ref + phone inputs, submit handler | **Create** |
| `src/app/track-order/OrderTimeline.tsx` | 5-step timeline with circles, connectors, timestamps, tracking-code slot | **Create** |
| `src/app/track-order/OrderResult.tsx` | Status badge + timeline + items + address; cancellation block | **Create** |
| `src/lib/nav.ts` | Add "Track Order" to `FOOTER_HELP` | **Modify** |
| `src/app/checkout/success/page.tsx` | Add "Track this order" button linking to `/track-order?order=DUB<displayId>` | **Modify** |

---

## Task 1: Pure helpers + types in `src/lib/track-order.ts`

**Files:**
- Create: `src/lib/track-order.ts`

- [ ] **Step 1: Create the file with all helpers and the response type**

```ts
// src/lib/track-order.ts
import type { HttpTypes } from "@medusajs/types";

export const MAURITIUS_POST_TRACK_URL =
  "https://www.mauritiuspost.mu/track-trace/?tracking_code=";

export type TrackOrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "canceled";

export type TrackOrderResponse = {
  displayId: string;
  status: TrackOrderStatus;
  placedAt: string;
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
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
  };
  trackingCode: string | null;
  trackingUrl: string | null;
  canceledAt: string | null;
  steps: {
    placedAt: string;
    confirmedAt: string | null;
    packedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
};

export type OrderRef =
  | { kind: "id"; value: string }       // order_01HXYZ...
  | { kind: "displayId"; value: number } // 1042
  | { kind: "invalid" };

export function parseOrderRef(input: string): OrderRef {
  const cleaned = input.trim().replace(/^#/, "").toUpperCase();
  if (cleaned.startsWith("ORDER_")) {
    return { kind: "id", value: cleaned.toLowerCase() };
  }
  const stripped = cleaned.replace(/^DUB/, "");
  const n = Number.parseInt(stripped, 10);
  if (Number.isFinite(n) && n > 0 && String(n) === stripped) {
    return { kind: "displayId", value: n };
  }
  return { kind: "invalid" };
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("230")) return digits.slice(3);
  return digits;
}

export function buildTrackingUrl(code: string | null): string | null {
  if (!code) return null;
  return `${MAURITIUS_POST_TRACK_URL}${encodeURIComponent(code)}`;
}

export function readTrackingCode(
  order: HttpTypes.StoreOrder,
): string | null {
  const fromOrder = order.metadata?.["tracking_code"];
  if (typeof fromOrder === "string" && fromOrder.trim()) return fromOrder.trim();
  const firstFulfillment = order.fulfillments?.[0];
  const fromFulfillment = firstFulfillment?.metadata?.["tracking_code"];
  if (typeof fromFulfillment === "string" && fromFulfillment.trim()) {
    return fromFulfillment.trim();
  }
  return null;
}

export function readConfirmedAt(
  order: HttpTypes.StoreOrder,
): string | null {
  const v = order.metadata?.["confirmed_at"];
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

export function deriveStatus(
  order: HttpTypes.StoreOrder,
): TrackOrderStatus {
  if (order.status === "canceled") return "canceled";
  const fs = order.fulfillment_status;
  if (fs === "delivered") return "delivered";
  if (fs === "shipped" || fs === "partially_shipped") return "shipped";
  if (fs === "fulfilled" || fs === "partially_fulfilled") return "packed";
  if (readConfirmedAt(order)) return "confirmed";
  return "placed";
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/track-order.ts
git commit -m "feat(track-order): add helpers and response type"
```

---

## Task 2: Route Handler at `src/app/api/track-order/route.ts`

**Files:**
- Create: `src/app/api/track-order/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
// src/app/api/track-order/route.ts
import { NextResponse } from "next/server";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/medusa";
import {
  buildTrackingUrl,
  deriveStatus,
  normalizePhone,
  parseOrderRef,
  readConfirmedAt,
  readTrackingCode,
  type TrackOrderResponse,
} from "@/lib/track-order";

const NOT_FOUND = NextResponse.json(
  { error: "not_found" as const },
  { status: 404 },
);

const ORDER_FIELDS = [
  "*items",
  "*items.variant",
  "*shipping_address",
  "*shipping_methods",
  "*fulfillments",
  "+subtotal",
  "+total",
  "+shipping_total",
  "+status",
  "+metadata",
  "+display_id",
  "+created_at",
  "+currency_code",
  "+fulfillment_status",
].join(",");

// TODO: rate-limit per IP if abuse appears (deferred — out of scope for v1).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const orderRefRaw =
    typeof (body as { orderRef?: unknown })?.orderRef === "string"
      ? (body as { orderRef: string }).orderRef
      : "";
  const phoneRaw =
    typeof (body as { phone?: unknown })?.phone === "string"
      ? (body as { phone: string }).phone
      : "";

  const ref = parseOrderRef(orderRefRaw);
  const normalizedPhone = normalizePhone(phoneRaw);
  if (ref.kind === "invalid" || !normalizedPhone) {
    return NOT_FOUND;
  }

  let order: HttpTypes.StoreOrder | null = null;
  try {
    if (ref.kind === "id") {
      const res = await sdk.store.order.retrieve(ref.value, {
        fields: ORDER_FIELDS,
      });
      order = res.order ?? null;
    } else {
      const res = await sdk.store.order.list({
        display_id: ref.value,
        fields: ORDER_FIELDS,
        limit: 1,
      } as HttpTypes.StoreOrderFilters);
      order = res.orders?.[0] ?? null;
    }
  } catch {
    return NOT_FOUND;
  }

  if (!order) return NOT_FOUND;

  const storedPhone = normalizePhone(order.shipping_address?.phone ?? "");
  if (!storedPhone || storedPhone !== normalizedPhone) {
    return NOT_FOUND;
  }

  const trackingCode = readTrackingCode(order);
  const ship = order.shipping_address;
  const ful = order.fulfillments?.[0];

  const response: TrackOrderResponse = {
    displayId: `DUB${order.display_id}`,
    status: deriveStatus(order),
    placedAt: String(order.created_at),
    shippingAddress: {
      firstName: ship?.first_name ?? "",
      lastName: ship?.last_name ?? "",
      address1: ship?.address_1 ?? "",
      address2: ship?.address_2 ?? undefined,
      city: ship?.city ?? "",
      province: ship?.province ?? "",
      postalCode: ship?.postal_code ?? undefined,
    },
    items: (order.items ?? []).map((it) => ({
      title: it.product_title ?? "",
      variantTitle: it.variant_title ?? undefined,
      quantity: it.quantity,
      unitPrice: it.unit_price ?? 0,
      thumbnail: it.thumbnail ?? undefined,
    })),
    totals: {
      subtotal: order.subtotal ?? 0,
      shipping: order.shipping_total ?? 0,
      total: order.total ?? 0,
      currency: order.currency_code ?? "MUR",
    },
    trackingCode,
    trackingUrl: buildTrackingUrl(trackingCode),
    canceledAt: order.status === "canceled" ? String(order.updated_at) : null,
    steps: {
      placedAt: String(order.created_at),
      confirmedAt: readConfirmedAt(order),
      packedAt: ful?.packed_at ? String(ful.packed_at) : null,
      shippedAt: ful?.shipped_at ? String(ful.shipped_at) : null,
      deliveredAt: ful?.delivered_at ? String(ful.delivered_at) : null,
    },
  };

  return NextResponse.json(response);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes. If `StoreOrderFilters` is not the correct type name (Medusa renames vary), open `node_modules/@medusajs/types/dist/http/order/store/queries.d.ts` and use the actual exported type name. Replace the cast accordingly.

- [ ] **Step 3: Smoke-test the route handler from a real terminal (server running)**

In one terminal: `npm run dev`

In another terminal, replace `<orderId>` and `<phone>` with values from a real order in your Medusa admin:

```bash
curl -i -X POST http://localhost:3000/api/track-order \
  -H "content-type: application/json" \
  -d "{\"orderRef\":\"DUB1\",\"phone\":\"57123456\"}"
```

Expected for a real order: `200` with the JSON shape above. For a wrong phone or fake order: `404 {"error":"not_found"}`. For empty body: `400 {"error":"bad_request"}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/track-order/route.ts
git commit -m "feat(track-order): add POST /api/track-order route handler"
```

---

## Task 3: Form component `src/app/track-order/TrackOrderForm.tsx`

**Files:**
- Create: `src/app/track-order/TrackOrderForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
// src/app/track-order/TrackOrderForm.tsx
"use client";

import { useState } from "react";

export type TrackSubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "network_error" };

type Props = {
  initialOrderRef?: string;
  initialPhone?: string;
  state: TrackSubmitState;
  onSubmit: (orderRef: string, phone: string) => void;
};

export function TrackOrderForm({
  initialOrderRef = "",
  initialPhone = "",
  state,
  onSubmit,
}: Props) {
  const [orderRef, setOrderRef] = useState(initialOrderRef);
  const [phone, setPhone] = useState(initialPhone);
  const [touched, setTouched] = useState(false);

  const orderRefError =
    touched && !orderRef.trim() ? "Order number is required" : null;
  const phoneError =
    touched && phone.replace(/\D/g, "").length < 7
      ? "Enter the phone you used at checkout"
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!orderRef.trim() || phone.replace(/\D/g, "").length < 7) return;
    onSubmit(orderRef.trim(), phone.trim());
  };

  const isLoading = state.kind === "loading";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-blush-400 bg-white p-6 lg:p-8"
      noValidate
    >
      <h1 className="font-display text-2xl font-semibold text-ink">
        Track your order
      </h1>
      <p className="mt-2 font-sans text-sm text-ink-muted">
        Enter your order number and the phone number you used at checkout.
      </p>

      {state.kind === "not_found" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700"
        >
          We couldn&apos;t find an order matching those details. Double-check
          your order number and phone number.
        </div>
      )}
      {state.kind === "network_error" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700"
        >
          Couldn&apos;t reach the server. Please try again.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-ink">
            Order number
          </span>
          <input
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="DUB1042"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-blush-400 px-3 py-2 font-sans text-sm text-ink focus:border-coral-500 focus:outline-none"
          />
          {orderRefError && (
            <span className="mt-1 block font-sans text-[12px] text-red-600">
              {orderRefError}
            </span>
          )}
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-ink">
            Phone number
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5712 3456"
            autoComplete="tel"
            className="mt-1 w-full rounded-md border border-blush-400 px-3 py-2 font-sans text-sm text-ink focus:border-coral-500 focus:outline-none"
          />
          {phoneError && (
            <span className="mt-1 block font-sans text-[12px] text-red-600">
              {phoneError}
            </span>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full rounded-md bg-coral-500 px-6 py-3 font-sans text-sm font-semibold text-white hover:bg-coral-700 disabled:opacity-60 sm:w-auto"
      >
        {isLoading ? "Tracking…" : "Track"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/track-order/TrackOrderForm.tsx
git commit -m "feat(track-order): add lookup form component"
```

---

## Task 4: Timeline component `src/app/track-order/OrderTimeline.tsx`

**Files:**
- Create: `src/app/track-order/OrderTimeline.tsx`

- [ ] **Step 1: Create the timeline**

```tsx
// src/app/track-order/OrderTimeline.tsx
"use client";

import type { TrackOrderResponse, TrackOrderStatus } from "@/lib/track-order";

const STEPS: {
  key: keyof TrackOrderResponse["steps"];
  label: string;
  reachedFor: TrackOrderStatus[];
}[] = [
  { key: "placedAt", label: "Placed", reachedFor: ["placed", "confirmed", "packed", "shipped", "delivered"] },
  { key: "confirmedAt", label: "Confirmed", reachedFor: ["confirmed", "packed", "shipped", "delivered"] },
  { key: "packedAt", label: "Packed", reachedFor: ["packed", "shipped", "delivered"] },
  { key: "shippedAt", label: "Out for delivery", reachedFor: ["shipped", "delivered"] },
  { key: "deliveredAt", label: "Delivered", reachedFor: ["delivered"] },
];

function formatStepDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-MU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  status: TrackOrderStatus;
  steps: TrackOrderResponse["steps"];
  trackingCode: string | null;
  trackingUrl: string | null;
};

export function OrderTimeline({ status, steps, trackingCode, trackingUrl }: Props) {
  const reachedIndex = STEPS.reduce(
    (acc, s, i) => (s.reachedFor.includes(status) ? i : acc),
    -1,
  );

  return (
    <ol className="grid gap-4 md:grid-cols-5 md:gap-0">
      {STEPS.map((s, i) => {
        const reached = i <= reachedIndex;
        const isCurrent = i === reachedIndex;
        const date = formatStepDate(steps[s.key]);
        const isShippedStep = s.key === "shippedAt";

        return (
          <li
            key={s.key}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex gap-3 md:flex-col md:items-center md:text-center"
          >
            <div className="flex flex-col items-center md:contents">
              <span
                className={[
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-sans text-[12px] font-bold",
                  reached
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-blush-300 bg-white text-blush-400",
                ].join(" ")}
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={[
                    "z-0 md:absolute md:left-1/2 md:top-3 md:h-0.5 md:w-full",
                    "h-full w-0.5 md:translate-x-0",
                    reached && i < reachedIndex ? "bg-coral-500" : "bg-blush-300",
                  ].join(" ")}
                  aria-hidden
                />
              )}
            </div>
            <div className="md:mt-3">
              <p
                className={[
                  "font-display text-sm",
                  reached ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {s.label}
              </p>
              {date && (
                <p className="mt-1 font-sans text-[11px] text-ink-muted">
                  {date}
                </p>
              )}
              {isShippedStep && reached && trackingCode && trackingUrl && (
                <p className="mt-2 font-sans text-[12px] text-ink-soft">
                  Tracking:{" "}
                  <span className="font-semibold text-ink">{trackingCode}</span>
                  <br />
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-coral-500 underline hover:text-coral-700"
                  >
                    Track on Mauritius Post →
                  </a>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/track-order/OrderTimeline.tsx
git commit -m "feat(track-order): add 5-step timeline component"
```

---

## Task 5: Result component `src/app/track-order/OrderResult.tsx`

**Files:**
- Create: `src/app/track-order/OrderResult.tsx`

- [ ] **Step 1: Create the result component**

```tsx
// src/app/track-order/OrderResult.tsx
"use client";

import Image from "next/image";
import type { TrackOrderResponse, TrackOrderStatus } from "@/lib/track-order";
import { formatPrice } from "@/lib/format";
import { OrderTimeline } from "./OrderTimeline";

const STATUS_LABEL: Record<TrackOrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Out for delivery",
  delivered: "Delivered",
  canceled: "Canceled",
};

const STATUS_TONE: Record<TrackOrderStatus, string> = {
  placed: "bg-coral-500/10 text-coral-700",
  confirmed: "bg-coral-500/10 text-coral-700",
  packed: "bg-coral-500/10 text-coral-700",
  shipped: "bg-coral-500/10 text-coral-700",
  delivered: "bg-emerald-50 text-emerald-700",
  canceled: "bg-blush-300/30 text-ink-muted",
};

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-MU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrderResult({ data }: { data: TrackOrderResponse }) {
  const isCanceled = data.status === "canceled";

  return (
    <div className="rounded-2xl border border-blush-400 bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-[12px] uppercase tracking-wide text-ink-muted">
            Order
          </p>
          <p className="font-display text-2xl font-semibold text-ink">
            #{data.displayId}
          </p>
          <p className="mt-1 font-sans text-[12px] text-ink-muted">
            Placed {formatLongDate(data.placedAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${
            STATUS_TONE[data.status]
          }`}
        >
          {STATUS_LABEL[data.status]}
        </span>
      </div>

      <div className="mt-8">
        {isCanceled ? (
          <div className="rounded-md border border-blush-300 bg-blush-100/40 px-4 py-4 font-sans text-sm text-ink-muted">
            Order canceled
            {data.canceledAt
              ? ` on ${formatLongDate(data.canceledAt)}`
              : ""}.
          </div>
        ) : (
          <OrderTimeline
            status={data.status}
            steps={data.steps}
            trackingCode={data.trackingCode}
            trackingUrl={data.trackingUrl}
          />
        )}
      </div>

      <div className="mt-8 border-t border-blush-100 pt-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">
          Items
        </h2>
        <ul className="space-y-4">
          {data.items.map((it, idx) => (
            <li key={idx} className="flex gap-3">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-blush-300">
                {it.thumbnail ? (
                  <Image
                    src={it.thumbnail}
                    alt={it.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-display text-[13px] font-medium text-ink">
                  {it.title}
                </span>
                <span className="font-sans text-[11px] text-ink-muted">
                  {it.variantTitle ? `${it.variantTitle} · ` : ""}Qty{" "}
                  {it.quantity}
                </span>
                <span className="mt-auto font-sans text-[13px] font-semibold text-ink">
                  {formatPrice(it.unitPrice * it.quantity, data.totals.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-1.5 font-sans text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd>{formatPrice(data.totals.subtotal, data.totals.currency)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Shipping</dt>
            <dd>{formatPrice(data.totals.shipping, data.totals.currency)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-blush-100 pt-3 font-display text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(data.totals.total, data.totals.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 border-t border-blush-100 pt-6">
        <h2 className="mb-2 font-display text-base font-semibold text-ink">
          Delivering to
        </h2>
        <p className="font-sans text-sm text-ink-soft">
          {data.shippingAddress.firstName} {data.shippingAddress.lastName}
          <br />
          {data.shippingAddress.address1}
          {data.shippingAddress.address2
            ? `, ${data.shippingAddress.address2}`
            : ""}
          <br />
          {data.shippingAddress.city}, {data.shippingAddress.province}
          {data.shippingAddress.postalCode
            ? ` ${data.shippingAddress.postalCode}`
            : ""}
          <br />
          Mauritius
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/track-order/OrderResult.tsx
git commit -m "feat(track-order): add result component (status, timeline, recap)"
```

---

## Task 6: Page shell `src/app/track-order/page.tsx`

**Files:**
- Create: `src/app/track-order/page.tsx`

- [ ] **Step 1: Create the page (Suspense-wrapped, since it reads `useSearchParams`)**

```tsx
// src/app/track-order/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrackOrderForm, type TrackSubmitState } from "./TrackOrderForm";
import { OrderResult } from "./OrderResult";
import type { TrackOrderResponse } from "@/lib/track-order";

function TrackOrderInner() {
  const params = useSearchParams();
  const initialOrderRef = params.get("order") ?? "";

  const [state, setState] = useState<TrackSubmitState>({ kind: "idle" });
  const [data, setData] = useState<TrackOrderResponse | null>(null);

  const onSubmit = async (orderRef: string, phone: string) => {
    setState({ kind: "loading" });
    setData(null);
    try {
      const res = await fetch("/api/track-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderRef, phone }),
      });
      if (res.status === 404) {
        setState({ kind: "not_found" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "network_error" });
        return;
      }
      const json = (await res.json()) as TrackOrderResponse;
      setData(json);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "network_error" });
    }
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-8 px-4 py-12 lg:py-20">
      <TrackOrderForm
        initialOrderRef={initialOrderRef}
        state={state}
        onSubmit={onSubmit}
      />
      {data && <OrderResult data={data} />}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-20 text-center font-sans text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Manual smoke test in the browser**

With `npm run dev` running, visit:

1. `http://localhost:3000/track-order` — form renders, no result.
2. Submit empty → both fields show inline errors, no network call (check devtools Network tab).
3. Submit a real order ref + phone → result renders below the form. Verify status badge, timeline, items recap, address all populate.
4. Submit wrong phone → red "couldn't find" banner. Result panel disappears.
5. `http://localhost:3000/track-order?order=DUB1042` — order field is pre-filled.
6. Stop the dev server, submit the form → red "couldn't reach" banner.

- [ ] **Step 4: Commit**

```bash
git add src/app/track-order/page.tsx
git commit -m "feat(track-order): add page shell wiring form + result"
```

---

## Task 7: Footer link

**Files:**
- Modify: `src/lib/nav.ts`

- [ ] **Step 1: Add "Track Order" to `FOOTER_HELP`**

Open `src/lib/nav.ts` and replace the `FOOTER_HELP` block:

```ts
export const FOOTER_HELP = [
  { label: "Track Order", href: "/track-order" },
  { label: "Contact Us", href: "/contact" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping & Returns", href: "/faq#shipping" },
];
```

`Footer.tsx` already renders this list — no changes needed there.

- [ ] **Step 2: Type-check + visual check**

Run: `npx tsc --noEmit` (passes).

With `npm run dev`, scroll to the footer on any page and confirm "Track Order" appears under the Help column and links to `/track-order`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav.ts
git commit -m "feat(track-order): add Track Order link to footer Help column"
```

---

## Task 8: "Track this order" button on `/checkout/success`

**Files:**
- Modify: `src/app/checkout/success/page.tsx`

- [ ] **Step 1: Replace the action-button block at the bottom of the success card**

Find this block in `src/app/checkout/success/page.tsx` (around lines 174–187):

```tsx
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/shop"
            className="flex-1 rounded-md bg-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-white hover:bg-coral-700"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-md border-[1.5px] border-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-coral-500 hover:bg-blush-100"
          >
            Back to Home
          </Link>
        </div>
```

Replace it with:

```tsx
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/track-order?order=DUB${order.display_id}`}
            className="flex-1 rounded-md bg-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-white hover:bg-coral-700"
          >
            Track this order
          </Link>
          <Link
            href="/shop"
            className="flex-1 rounded-md border-[1.5px] border-coral-500 px-4 py-3 text-center font-sans text-sm font-semibold text-coral-500 hover:bg-blush-100"
          >
            Continue Shopping
          </Link>
        </div>
```

(The "Back to Home" link is dropped — Header already has a Home link, two outline buttons stacked next to each other felt redundant.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Manual smoke test (full happy path)**

With `npm run dev` running and a real Medusa backend reachable:

1. Place a test order via existing checkout (`/` → product → Add to Bag → drawer → Checkout → fill form → Place Order).
2. On `/checkout/success`, click **Track this order**.
3. Confirm `/track-order?order=DUB<id>` opens with the order field pre-filled.
4. Type the same phone you used at checkout, submit.
5. Confirm status badge says "Order placed" (or "Confirmed" if `metadata.confirmed_at` is already set).
6. In Medusa admin, mark the order's fulfillment as shipped and add `metadata.tracking_code = "RR123456789MU"` on the order.
7. Refresh `/track-order` (with the same fields filled) → submit → confirm "Out for delivery" step lights up and the Mauritius Post link renders.

- [ ] **Step 4: Commit**

```bash
git add src/app/checkout/success/page.tsx
git commit -m "feat(track-order): add Track this order button to success page"
```

---

## Task 9: Final verification

**Files:** none

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: zero new errors across the whole project.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new warnings or errors in `src/app/track-order/**`, `src/app/api/track-order/**`, `src/lib/track-order.ts`, `src/lib/nav.ts`, `src/app/checkout/success/page.tsx`.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. The new route shows up as `ƒ /track-order` (dynamic) and `ƒ /api/track-order` (route handler) in the Next.js output.

- [ ] **Step 4: Re-run the smoke checklist**

Run through the full smoke list from the spec (`docs/superpowers/specs/2026-05-02-track-order-design.md` § "Smoke test (post-implementation)"):
- Happy path from success page.
- Wrong phone → generic banner.
- Made-up order number → same generic banner.
- `#DUB<id>` with `#` and uppercase → resolves.
- Mark fulfillment shipped + add `metadata.tracking_code` → tracking link renders.
- Cancel the order in admin → cancellation block replaces timeline.
- Empty form submit → inline errors, no network call.

- [ ] **Step 5: Confirm to user that the feature is ready**

Report: type check passes, build succeeds, all smoke cases verified manually. No changes needed in `Backend/dollup-medusa/` for v1.
