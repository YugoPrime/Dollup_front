# Pre-Order Checkout & Deposit Flow — Design

**Date:** 2026-05-29
**Status:** Approved (design)
**Repos touched:** `DUB-front` (storefront), `dollup-medusa` (backend), `dollup-admin` (admin UI)

---

## Problem

`preorder.dollupboutique.com/checkout` 404s ("This style has moved.").

Root cause: `DUB-front/src/proxy.ts` rewrites every non-`/preorder` path on the
preorder host to `/preorder/<path>`. The cart drawer's "Proceed to Checkout"
button hard-codes `<Link href="/checkout">`, which rewrites to
`/preorder/checkout` — a route that does not exist → 404.

The deeper issue: there is no pre-order checkout at all. The apex `/checkout`
is a Cash-on-Delivery (COD) flow that assumes the full total is collected at
delivery. Pre-orders need a **75% deposit now / 25% balance on arrival** model
with a ~15–20 day SHEIN lead time. Sending a pre-order customer through COD
would let them reserve a SHEIN order with zero money down.

## Goal

A dedicated pre-order checkout on the pre-order host:

1. Customer fills the same form as apex (contact + MU delivery address).
2. On "Place Order", a **real Medusa order** is created with a custom payment
   provider and `metadata.preorder_status = "awaiting_deposit"`.
3. Customer sees deposit instructions on a success page **and** by email
   (Juice/MCB transfer, 75% deposit amount, 24h deadline).
4. The order stays "awaiting deposit" until the owner confirms the bank
   transfer, then advances to "deposit paid" and proceeds via the normal
   fulfilment flow when the SHEIN order lands.
5. A dedicated admin **pre-order orders** view manages this lifecycle, fully
   separate from in-stock order entry.

## Non-goals

- Online card payment / payment gateway integration (deposit is manual Juice transfer).
- Mixing in-stock and pre-order items in one order (already blocked by `canAddItem`).
- SHEIN stock validation at checkout (pre-order products are always orderable).
- Per-host localStorage cart key (existing `cart-type` infra already isolates
  pre-order carts into a separate Medusa sales channel — see Cart Isolation).

---

## Approach (chosen: "A — lean on existing infra")

The stack already has:
- `lib/cart-type.ts` — classifies carts `instock` vs `preorder`, blocks mixing
  via `canAddItem`.
- Per-channel SDKs (`clientSdk`, `preorderClientSdk`) keyed by separate
  publishable keys → separate Medusa sales channels.
- `lib/preorder.ts`, `lib/medusa-preorder.ts` — pre-order product fetch.
- Resend email + Telegram order notification subscriber on the backend.

So the delta is: a forked checkout page/form, a new payment provider, status
metadata, email templates, a cron, and a new admin orders view. ~70% reuse.

### Cart isolation (explicit decision)

We do **NOT** add a second localStorage key. Pre-order items already land in a
separate Medusa cart bound to the Pre-Order sales channel, and `canAddItem`
rejects adding an in-stock item to a pre-order cart (and vice-versa). The carts
are logically separate today; what was missing is a checkout that honors the
separation. The single shared `dub_cart_id` key is retained.

The one required change: `CartDrawer`'s "Proceed to Checkout" link branches on
`cartTypeOf(cart)`:
- `preorder` → `/preorder/checkout`
- `instock` (or null) → `/checkout`

---

## Architecture

| Layer | Owns | New | Edited |
|---|---|---|---|
| **DUB-front** | Pre-order checkout page, form, success page, deposit math, drawer link | `src/app/(preorder)/preorder/checkout/page.tsx`, `PreorderCheckoutForm.tsx`, `PreorderOrderSummary.tsx`, `success/page.tsx`, `src/lib/preorder-checkout.ts`, `src/components/checkout/CheckoutFields.tsx` (extracted shared) | `src/components/cart/CartDrawer.tsx`, `src/app/checkout/CheckoutForm.tsx` (consume extracted fields) |
| **dollup-medusa** | Payment provider, status metadata, Telegram fork, admin API, cron | `src/modules/payment-preorder-deposit/`, `src/api/admin/preorder-orders/route.ts` (+ `[id]/mark-paid`), `src/jobs/preorder-deposit-cleanup.ts`, `src/emails/preorder/{deposit-instructions,deposit-reminder,reservation-expired,deposit-confirmed}.tsx` | Telegram order subscriber, order-placed email subscriber (fork by status) |
| **dollup-admin** | Pre-order orders view + deposit actions (built by subagent) | `src/app/(app)/preorder/orders/page.tsx`, `PreorderOrdersClient.tsx`, `actions.ts`, `src/lib/admin-preorder-orders.ts` | `src/components/AdminNavLinks.tsx` (Products\|Orders sub-nav), `src/app/(app)/preorder/layout.tsx` (sub-nav tabs) |

### High-level flow

```
preorder.dollupboutique.com → cart drawer → /preorder/checkout (sage theme)
  → fill form (validated by shared lib/checkout.ts)
  → submit:
      cart.update(email, shipping_address, billing_address, metadata.notes)
      cart.addShippingMethod(option_id)              [preorder sales-channel option]
      payment.initiatePaymentSession({ provider_id: "pp_preorder_deposit" })
      cart.complete()
        → provider stamps order.metadata:
            preorder_status   = "awaiting_deposit"
            total_amount      = items + delivery (Medusa amount units)
            deposit_amount    = ceil(total * 0.75 / 50) * 50   [round up to Rs 50]
            balance_amount    = total - deposit
            deposit_deadline  = placed_at + 24h (ISO)
            reminder_sent     = false
            deposit_paid_at   = null
      clearCart()                                     [wipes active preorder cart only]
      router.push(/preorder/checkout/success?order=<id>)

  order.placed event:
    ├─ Telegram ping (preorder-flavored)
    ├─ Customer email: deposit instructions (+ CC eabmarkets@gmail.com)
    └─ (success page shows the same numbers, persistently)

  Cron every 15 min:
    ├─ awaiting_deposit & now ≥ deadline−1h & !reminder_sent
    │     → reminder email + WhatsApp link; set reminder_sent=true
    └─ awaiting_deposit & now ≥ deadline
          → cancel order; "reservation expired" email; preorder_status="expired"

  Admin /preorder/orders "Mark deposit received":
    → preorder_status="deposit_paid", deposit_paid_at=now
    → Telegram ping + "deposit confirmed" customer email
    → order proceeds via normal Medusa fulfilment when SHEIN lands
```

---

## Data model

No new table. Lifecycle lives in `order.metadata` so the order stays inside
existing Medusa/admin tooling.

```ts
order.metadata = {
  cart_type:        "preorder",         // stamped by existing cart-type infra
  preorder_status:  "awaiting_deposit", // "awaiting_deposit" | "deposit_paid" | "expired"
  total_amount:     number,             // Medusa amount units — items + delivery
  deposit_amount:   number,             // 75%, rounded up to Rs 50
  balance_amount:   number,             // total - deposit
  deposit_deadline: string,             // ISO — placed_at + 24h
  reminder_sent:    boolean,
  deposit_paid_at:  string | null,      // ISO
}
```

> **Amount units:** This stack uses Medusa MUR amounts **raw** — `formatPrice`
> does not divide by 100 and the cart drawer renders `cart.subtotal` directly.
> So all deposit math operates in the same units the cart exposes (`item_total`,
> `shipping_total`). "Round up to Rs 50" = `ceil(x / 50) * 50`. The
> implementation tracer-bullet MUST confirm one real cart's `item_total` value
> against the displayed price before trusting the constant, since a cents-vs-
> whole-unit mismatch here would silently 100× the deposit.

**State machine:**
```
awaiting_deposit ──(owner marks paid)──▶ deposit_paid ──(normal fulfilment)──▶ shipped/delivered
       └────────────(24h, no payment)──▶ expired (order canceled)
```

Amounts are computed **once**, server-side, by the payment provider at
authorize time. Success page, email, and admin all read the same stamped
values — no recomputation drift.

### Deposit math (single source of truth: `lib/preorder-checkout.ts` + provider)

```
total   = item_total + shipping_total          (Medusa amount units — raw, see note above)
deposit = ceil(total * 0.75 / 50) * 50         (round UP to nearest Rs 50)
balance = total - deposit
```

The frontend `lib/preorder-checkout.ts` mirrors this for the live order-summary
preview; the backend provider is authoritative for the stamped values.

---

## Frontend detail

- **`/preorder/checkout/page.tsx`** — sage-themed server shell (mirrors apex
  `checkout/page.tsx` structure), renders `PreorderCheckoutForm`.
- **`PreorderCheckoutForm.tsx`** — client form. Reuses extracted
  `CheckoutFields` (contact + MU address), `lib/checkout.ts` validators and
  `toMedusaAddress`. Submit sequence as above with `pp_preorder_deposit`.
  Guard: if `cartTypeOf(cart) !== "preorder"`, render a "this is the pre-order
  checkout" notice linking to `/checkout`.
- **`PreorderOrderSummary.tsx`** — shows Total / Deposit (due now) / Balance
  (on arrival), using `lib/preorder-checkout.ts`.
- **`success/page.tsx`** — order #, deposit amount, Juice details
  (`PAYMENT_INFO`), 24h deadline, "we emailed you a copy" reassurance.
- **`CheckoutFields.tsx`** — extracted from apex `CheckoutForm` so both forms
  share the contact/address inputs and don't drift. Apex form refactored to
  consume it (behavior-preserving).
- **`CartDrawer.tsx`** — branch checkout link on `cartTypeOf(cart)`.

## Backend detail

- **`payment-preorder-deposit` module** — Medusa payment provider
  `pp_preorder_deposit`. Like `pp_system_default` (manual capture) but its
  authorize step computes and returns the deposit breakdown so the order's
  metadata can be stamped. Registered in `medusa-config` and added to the
  Pre-Order sales channel's payment options.
- **Telegram subscriber** — fork message copy by `metadata.preorder_status`
  (preorder placement reads: total, deposit, deadline, customer).
- **Order-placed email subscriber** — if `cart_type === "preorder"`, send
  deposit-instructions template instead of standard confirmation; CC owner.
- **`preorder-deposit-cleanup` cron** — every 15 min; idempotent guards on
  status; reminder at deadline−1h, cancel + expire at deadline.
- **`/admin/preorder-orders` API** — list orders where
  `metadata.cart_type === "preorder"`, grouped/filterable by `preorder_status`;
  `POST /admin/preorder-orders/[id]/mark-paid` action.

## Admin detail (subagent-built)

- New route **`/preorder/orders`** under existing Pre-Order section.
- `preorder/layout.tsx` gains a **Products | Orders** sub-nav tab bar.
- Orders view is **status-grouped**, sage-tinted to distinguish from coral
  in-stock orders:
  - **🔴 Awaiting deposit** (default-expanded): order #, customer, items,
    deposit amount, countdown to deadline; actions **[Mark deposit received]**
    · [Copy WhatsApp reminder] · [Cancel].
  - **🟢 Deposit paid — in transit**: balance due on arrival, placed date;
    hand off to normal fulfilment.
  - **⚪ Expired / canceled** (collapsed): audit trail.
- Data fetch via existing `medusa-admin.ts`; server actions follow `/orders`
  + `admin-orders.ts` patterns. "Mark deposit received" calls the backend
  mark-paid action.

---

## Error handling

- Empty pre-order cart at `/preorder/checkout` → empty state, no redirect.
- Wrong host / wrong cart type → notice + link to correct checkout (no crash).
- Account creation during checkout → optional, silent-fail (mirrors apex).
- Cron acting on already-advanced/canceled order → status guard makes it a
  no-op (idempotent).
- `cart.complete` failure → surface `result.error?.message` in the error
  banner (mirrors apex).
- Email send failure → must not block order completion (best-effort, logged).

## Testing / verification

No automated test infra in these repos (per CLAUDE.md). Verification:
- `npx tsc --noEmit` + `next build` (DUB-front, dollup-admin).
- Backend unit tests for the deposit-math helper and the cron status
  transitions (pure functions — worth a small Jest/vitest-free test script if
  one exists, else a one-off node script).
- Manual browser smoke (see checklist below).

### Smoke checklist
- preorder host → add pre-order product → drawer → "Proceed to Checkout" →
  lands on `/preorder/checkout` (NOT 404).
- Fill form → Place Order → `/preorder/checkout/success` shows order #, deposit
  amount, Juice details, deadline.
- Medusa admin shows order with `metadata.preorder_status="awaiting_deposit"`
  and correct deposit/balance/total.
- Telegram ping received (preorder-flavored).
- Customer email + owner CC received with deposit instructions.
- dollup-admin `/preorder/orders` → order under "Awaiting deposit" with
  countdown → "Mark deposit received" → moves to "Deposit paid", customer gets
  confirmation email.
- Cron: order past deadline with no payment → canceled + "expired" email;
  order near deadline → reminder email sent once.
- Apex `/checkout` still works unchanged (in-stock COD), drawer link correct on
  both hosts.

## Open questions / risks

- **Pre-Order sales-channel shipping option** must exist and be priced, or
  `addShippingMethod` has nothing to attach. Verify the preorder channel has a
  shipping option before building the form submit (likely already present since
  the cart-type infra references preorder shipping options).
- **Provider metadata stamping**: confirm Medusa v2 allows the payment provider
  to influence `order.metadata` at complete-time; if not, stamp via an
  `order.placed` subscriber reading the cart's payment-session data instead.
  (Fallback path documented; decided during implementation tracer-bullet.)
