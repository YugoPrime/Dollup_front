# Pre-Order Checkout & Deposit Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dedicated pre-order checkout on `preorder.dollupboutique.com` that creates a real Medusa order, collects a 75% deposit out-of-band (Juice transfer), shows + emails deposit instructions, and manages the deposit lifecycle through a dedicated admin orders view.

**Architecture:** Approach A (lean on existing infra). The cart-type system already isolates pre-order carts into the Pre-Order sales channel. We add: a forked `/preorder/checkout` page reusing apex checkout primitives; deposit lifecycle stamped onto `order.metadata` by an `order.placed` subscriber (NOT a custom payment provider — reuse `pp_system_default`); preorder-flavored Telegram + email; a cleanup cron; and a separate `/preorder/orders` admin view (subagent-built).

**Tech Stack:** Next.js 16 (DUB-front), Medusa v2.13.1 (dollup-medusa), Next.js admin (dollup-admin), Resend email, React Email, MUR stored as **whole rupees**.

**Repos & their git roots:**
- `DUB-front/` — storefront (git root)
- `Backend/dollup-medusa/` — backend (git root)
- `dollup-admin/` — admin (git root)
- Workspace root is NOT a git repo. `cd` into each repo before committing.

**Verified facts (2026-05-29, admin API):**
- MUR is whole rupees (sample variant prices 800/1100/890; `formatPrice` never divides by 100).
- Pre-Order channel `sc_01KSJVY1WR8265EE3BGVQP6GMN`; 4 priced flat shipping options on stock location `sloc_01KSMPP7411KT7AXW3NR0DV3FN`.
- 3 pre-order shipping options are 100× too high (cents-entered). **Phase 0 fixes them.**

---

## File Structure

**DUB-front:**
- Create: `src/lib/preorder-checkout.ts` — deposit math + provider id constant
- Create: `src/components/checkout/CheckoutFields.tsx` — extracted shared contact/address fields
- Create: `src/app/(preorder)/preorder/checkout/page.tsx` — sage server shell
- Create: `src/app/(preorder)/preorder/checkout/PreorderCheckoutForm.tsx` — client form
- Create: `src/app/(preorder)/preorder/checkout/PreorderOrderSummary.tsx` — deposit summary
- Create: `src/app/(preorder)/preorder/checkout/success/page.tsx` — deposit instructions
- Modify: `src/components/cart/CartDrawer.tsx` — branch checkout link by cart type
- Modify: `src/app/checkout/CheckoutForm.tsx` — consume `CheckoutFields` (behavior-preserving, optional/last)

**dollup-medusa:**
- Create: `src/scripts/fix-preorder-shipping-prices.ts` — Phase 0 data fix
- Create: `src/lib/preorder-deposit.ts` — deposit math (shared, mirrors frontend)
- Create: `src/subscribers/preorder-stamp-on-order-placed.ts` — stamp lifecycle metadata
- Create: `src/modules/notification-resend/templates/preorder-deposit-instructions.tsx`
- Create: `src/modules/notification-resend/templates/preorder-deposit-confirmed.tsx`
- Create: `src/modules/notification-resend/templates/preorder-reservation-expired.tsx`
- Create: `src/jobs/preorder-deposit-cleanup.ts` — reminder + auto-cancel cron
- Create: `src/api/admin/preorder-orders/route.ts` — GET list
- Create: `src/api/admin/preorder-orders/[id]/mark-paid/route.ts` — POST advance
- Modify: `src/modules/notification-resend/service.ts` — register 3 new templates
- Modify: `src/subscribers/telegram-on-order-placed.ts` — fork copy by preorder_status
- Modify: `src/subscribers/email-on-order-placed.ts` — skip standard email for preorder

**dollup-admin (subagent):**
- Create: `src/lib/admin-preorder-orders.ts` — fetch + actions client
- Create: `src/app/(app)/preorder/orders/page.tsx`
- Create: `src/app/(app)/preorder/orders/PreorderOrdersClient.tsx`
- Create: `src/app/(app)/preorder/orders/actions.ts`
- Create: `src/app/(app)/preorder/layout.tsx` — Products | Orders sub-nav

---

## Phase 0: Fix pre-order shipping prices (data, blocker)

### Task 0: Correct the 3 mispriced pre-order shipping options

**Files:**
- Create: `Backend/dollup-medusa/src/scripts/fix-preorder-shipping-prices.ts`

- [ ] **Step 1: Write the fix script**

```ts
// Corrects pre-order shipping options that were entered in cents (100x too
// high) to whole-rupee MUR amounts matching apex. One-shot; safe to re-run
// (idempotent — sets absolute values).
import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const FIXES: { id: string; name: string; amount: number }[] = [
  { id: "so_01KSMQMT8FJVNVK640TGJ8NYSB", name: "Home delivery (Pre-Order)", amount: 150 },
  { id: "so_01KSMQMT8F1RV9BRHB05PTVFSG", name: "Postage (Pre-Order)", amount: 70 },
  { id: "so_01KSMQMT8GARBFM0M9BVK4ZSY0", name: "Rodrigues Postage (Pre-Order)", amount: 100 },
  // Pickup (so_01KSMQMT8GWFT059W3W395AQCV) is already 0 — left untouched.
]

export default async function fixPreorderShippingPrices({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  for (const fix of FIXES) {
    const opt = await fulfillment.retrieveShippingOption(fix.id, {
      relations: ["prices"],
    })
    const murPrices = (opt.prices ?? []).filter(
      (p: any) => p.currency_code === "mur",
    )
    if (murPrices.length === 0) {
      logger.warn(`[fix-shipping] ${fix.name}: no MUR price found, skipping`)
      continue
    }
    await fulfillment.updateShippingOptions({
      id: fix.id,
      prices: murPrices.map((p: any) => ({ id: p.id, amount: fix.amount })),
    })
    logger.info(`[fix-shipping] ${fix.name} → MUR ${fix.amount}`)
  }
  logger.info("[fix-shipping] done")
}
```

- [ ] **Step 2: Run the script against the live DB**

Run: `cd Backend/dollup-medusa && yarn medusa exec ./src/scripts/fix-preorder-shipping-prices.ts`
Expected: 3 log lines `→ MUR 150 / 70 / 100`, then `done`.

- [ ] **Step 3: Verify via admin API**

Run (from `dollup-admin`, reusing the verification one-liner pattern):
```
node -e "/* login + GET /admin/shipping-options?fields=id,name,*prices, filter the 3 IDs, print prices */"
```
Expected: Home=150, Postage=70, Rodrigues=100, Pickup=0.

- [ ] **Step 4: Commit**

```bash
cd Backend/dollup-medusa
git add src/scripts/fix-preorder-shipping-prices.ts
git commit -m "fix: correct pre-order shipping option prices (cents->rupees)"
```

---

## Phase 1: Deposit math (pure functions, both repos)

### Task 1: Frontend deposit math

**Files:**
- Create: `DUB-front/src/lib/preorder-checkout.ts`
- Test: `DUB-front/src/lib/preorder-checkout.test.ts` (one-off node script — no test runner; see Step 2)

- [ ] **Step 1: Write the module**

```ts
// Pre-order deposit math. MUR is stored as WHOLE RUPEES in this stack
// (formatPrice never divides by 100; sample variant prices are 800/1100/890).
// So all amounts here are whole rupees.
export const PREORDER_PAYMENT_PROVIDER_ID = "pp_system_default"

export type DepositBreakdown = {
  total: number   // items + delivery
  deposit: number // 75%, rounded UP to nearest Rs 50
  balance: number // total - deposit
}

const DEPOSIT_RATE = 0.75
const ROUND_TO = 50

export function computeDeposit(itemTotal: number, shippingTotal: number): DepositBreakdown {
  const total = Math.max(0, Math.round(itemTotal) + Math.round(shippingTotal))
  const raw = total * DEPOSIT_RATE
  const deposit = Math.min(total, Math.ceil(raw / ROUND_TO) * ROUND_TO)
  return { total, deposit, balance: total - deposit }
}
```

- [ ] **Step 2: Write a one-off verification script and run it**

Create `DUB-front/src/lib/preorder-checkout.test.ts`:
```ts
import { computeDeposit } from "./preorder-checkout"
const cases: [number, number, { total: number; deposit: number; balance: number }][] = [
  [1000, 150, { total: 1150, deposit: 900, balance: 250 }],   // 862.5 -> ceil/50 = 900
  [800, 0, { total: 800, deposit: 600, balance: 200 }],       // 600 exact (multiple of 50)
  [890, 70, { total: 960, deposit: 750, balance: 210 }],      // 720 -> ceil/50 = 750
  [0, 0, { total: 0, deposit: 0, balance: 0 }],
]
let ok = true
for (const [i, s, exp] of cases) {
  const got = computeDeposit(i, s)
  const pass = got.total === exp.total && got.deposit === exp.deposit && got.balance === exp.balance
  if (!pass) { ok = false; console.error("FAIL", { i, s, got, exp }) }
}
console.log(ok ? "ALL PASS" : "FAILURES ABOVE")
if (!ok) process.exit(1)
```

Run: `cd DUB-front && npx tsx src/lib/preorder-checkout.test.ts`
(If `tsx` unavailable: `npx ts-node src/lib/preorder-checkout.test.ts`.)
Expected: `ALL PASS`

- [ ] **Step 3: Type-check**

Run: `cd DUB-front && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd DUB-front
git add src/lib/preorder-checkout.ts src/lib/preorder-checkout.test.ts
git commit -m "feat: pre-order deposit math (75% rounded up to Rs 50)"
```

### Task 2: Backend deposit math (mirror)

**Files:**
- Create: `Backend/dollup-medusa/src/lib/preorder-deposit.ts`
- Test: `Backend/dollup-medusa/src/lib/__tests__/preorder-deposit.spec.ts` (Jest — backend has `yarn test:unit`)

- [ ] **Step 1: Write the failing test**

```ts
import { computeDeposit } from "../preorder-deposit"
describe("computeDeposit", () => {
  it("rounds 75% up to nearest Rs 50", () => {
    expect(computeDeposit(1000, 150)).toEqual({ total: 1150, deposit: 900, balance: 250 })
  })
  it("handles exact multiples", () => {
    expect(computeDeposit(800, 0)).toEqual({ total: 800, deposit: 600, balance: 200 })
  })
  it("rounds a non-multiple 75% up to nearest 50", () => {
    expect(computeDeposit(890, 70)).toEqual({ total: 960, deposit: 750, balance: 210 })
  })
  it("caps deposit at total and handles zero", () => {
    expect(computeDeposit(0, 0)).toEqual({ total: 0, deposit: 0, balance: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend/dollup-medusa && yarn test:unit src/lib/__tests__/preorder-deposit.spec.ts`
Expected: FAIL — cannot find module `../preorder-deposit`.

- [ ] **Step 3: Write the module (identical logic to frontend)**

```ts
export type DepositBreakdown = { total: number; deposit: number; balance: number }
const DEPOSIT_RATE = 0.75
const ROUND_TO = 50
export function computeDeposit(itemTotal: number, shippingTotal: number): DepositBreakdown {
  const total = Math.max(0, Math.round(itemTotal) + Math.round(shippingTotal))
  const deposit = Math.min(total, Math.ceil((total * DEPOSIT_RATE) / ROUND_TO) * ROUND_TO)
  return { total, deposit, balance: total - deposit }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend/dollup-medusa && yarn test:unit src/lib/__tests__/preorder-deposit.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd Backend/dollup-medusa
git add src/lib/preorder-deposit.ts src/lib/__tests__/preorder-deposit.spec.ts
git commit -m "feat: backend pre-order deposit math + tests"
```

---

## Phase 2: TRACER BULLET — working checkout end-to-end (no email/admin yet)

This phase produces a checkout that creates a real preorder order with deposit metadata, viewable in Medusa admin. Email/admin/cron come after.

### Task 3: Extract shared CheckoutFields from apex form

**Files:**
- Create: `DUB-front/src/components/checkout/CheckoutFields.tsx`
- Read first: `DUB-front/src/app/checkout/CheckoutForm.tsx` (the contact + address JSX block and the `Field` component), `DUB-front/src/lib/checkout.ts` (`CheckoutFormState`, `FieldErrors`, MU districts, validators).

- [ ] **Step 1: Read the apex form's contact/address section**

Run: open `DUB-front/src/app/checkout/CheckoutForm.tsx`, locate the `Field` helper (lines ~82-140) and the contact + shipping-address inputs. Identify the exact props the inputs need: `state`, `errors`, `onChange(field, value)`, `onBlur(field)`.

- [ ] **Step 2: Create CheckoutFields with the contact + address inputs**

Extract the contact (email, phone, firstName, lastName) and MU shipping-address (address1, city, district select, postcode, notes) inputs into a presentational component. Exact signature:

```tsx
"use client";
import type { CheckoutFormState, FieldErrors } from "@/lib/checkout";

export type CheckoutFieldsProps = {
  state: CheckoutFormState;
  errors: FieldErrors;
  onChange: (field: keyof CheckoutFormState | string, value: string) => void;
  onBlur: (field: string) => void;
  // sage vs coral theming — preorder passes "sage"
  accent?: "coral" | "sage";
};

export function CheckoutFields({ state, errors, onChange, onBlur, accent = "coral" }: CheckoutFieldsProps) {
  // Move the existing Field components + district <select> here verbatim,
  // swapping hard-coded `coral-*` / `blush-*` classes for a small accent map:
  //   const ring = accent === "sage" ? "focus:border-sage-500" : "focus:border-coral-500";
  // Keep field names, autoComplete values, and aria wiring identical to apex.
  return (/* ...extracted JSX... */);
}
```

- [ ] **Step 3: Type-check**

Run: `cd DUB-front && npx tsc --noEmit`
Expected: no errors (component compiles standalone; apex not yet refactored to use it — that's Task 9, optional).

- [ ] **Step 4: Commit**

```bash
cd DUB-front
git add src/components/checkout/CheckoutFields.tsx
git commit -m "refactor: extract shared CheckoutFields (contact + MU address)"
```

### Task 4: Pre-order checkout page shell + summary

**Files:**
- Create: `DUB-front/src/app/(preorder)/preorder/checkout/page.tsx`
- Create: `DUB-front/src/app/(preorder)/preorder/checkout/PreorderOrderSummary.tsx`
- Read first: `DUB-front/src/app/checkout/page.tsx`, `DUB-front/src/app/checkout/OrderSummary.tsx`, `DUB-front/src/lib/preorder-checkout.ts` (Task 1).

- [ ] **Step 1: Create the summary component**

```tsx
"use client";
import type { HttpTypes } from "@medusajs/types";
import { formatPrice } from "@/lib/format";
import { computeDeposit } from "@/lib/preorder-checkout";

export function PreorderOrderSummary({ cart }: { cart: HttpTypes.StoreCart }) {
  const itemTotal = cart.item_total ?? cart.subtotal ?? 0;
  const shipping = cart.shipping_total ?? 0;
  const { total, deposit, balance } = computeDeposit(itemTotal, shipping);
  const currency = cart.currency_code ?? "MUR";
  return (
    <div className="rounded-lg border border-sage-200 bg-white p-5">
      <h2 className="font-display text-lg text-ink">Your reservation</h2>
      {/* line items map — mirror apex OrderSummary item rows */}
      <dl className="mt-4 space-y-2 text-[13px]">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(itemTotal, currency)}</dd></div>
        <div className="flex justify-between"><dt>Delivery</dt><dd>{formatPrice(shipping, currency)}</dd></div>
        <div className="flex justify-between font-semibold text-ink"><dt>Total</dt><dd>{formatPrice(total, currency)}</dd></div>
        <div className="mt-3 flex justify-between rounded bg-sage-50 px-3 py-2 font-semibold text-sage-900"><dt>Deposit due now (75%)</dt><dd>{formatPrice(deposit, currency)}</dd></div>
        <div className="flex justify-between text-ink-muted"><dt>Balance on arrival</dt><dd>{formatPrice(balance, currency)}</dd></div>
      </dl>
    </div>
  );
}
```

- [ ] **Step 2: Create the page shell**

```tsx
import type { Metadata } from "next";
import { PreorderCheckoutForm } from "./PreorderCheckoutForm";

export const metadata: Metadata = {
  title: "Pre-order checkout",
  robots: { index: false, follow: false },
};

export default function PreorderCheckoutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 lg:py-14">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">Reserve your pieces</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Confirm your details. You&apos;ll pay a 75% deposit to reserve; the balance is due when your order lands in Mauritius (~15–20 days).
      </p>
      <div className="mt-7"><PreorderCheckoutForm /></div>
    </main>
  );
}
```

- [ ] **Step 3: Stub the form so the page compiles**

Create a minimal `PreorderCheckoutForm.tsx` that returns `null` for now (filled in Task 5):
```tsx
"use client";
export function PreorderCheckoutForm() { return null; }
```

- [ ] **Step 4: Type-check + build**

Run: `cd DUB-front && npx tsc --noEmit && npm run build`
Expected: builds; `/preorder/checkout` route appears in output.

- [ ] **Step 5: Commit**

```bash
cd DUB-front
git add "src/app/(preorder)/preorder/checkout"
git commit -m "feat: pre-order checkout page shell + deposit summary"
```

### Task 5: Pre-order checkout form (submit → real order)

**Files:**
- Modify: `DUB-front/src/app/(preorder)/preorder/checkout/PreorderCheckoutForm.tsx`
- Read first: `DUB-front/src/app/checkout/CheckoutForm.tsx` (full submit sequence, lines ~380-480), `DUB-front/src/lib/cart-client.ts` (`getCartSdk`), `DUB-front/src/lib/cart-type.ts` (`cartTypeOf`), `DUB-front/src/lib/checkout.ts` (`validateCheckout`, `toMedusaAddress`, `EMPTY_CHECKOUT_STATE`).

- [ ] **Step 1: Implement the form**

Mirror apex `CheckoutForm` but: use `getCartSdk("preorder")`, render `CheckoutFields accent="sage"`, render `PreorderOrderSummary`, list shipping options via `fulfillment.listCartOptions` (the 4 preorder options), and on submit run the sequence. Wrong-cart guard at top:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { getCartSdk } from "@/lib/cart-client";
import { cartTypeOf } from "@/lib/cart-type";
import { CheckoutFields } from "@/components/checkout/CheckoutFields";
import { PreorderOrderSummary } from "./PreorderOrderSummary";
import { PREORDER_PAYMENT_PROVIDER_ID } from "@/lib/preorder-checkout";
import {
  EMPTY_CHECKOUT_STATE, validateCheckout, toMedusaAddress,
  type CheckoutFormState, type FieldErrors,
} from "@/lib/checkout";
import Link from "next/link";

export function PreorderCheckoutForm() {
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const [state, setState] = useState<CheckoutFormState>(EMPTY_CHECKOUT_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(null);
  const [options, setOptions] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load preorder shipping options.
  useEffect(() => {
    if (!cart) return;
    const sdk = getCartSdk("preorder");
    sdk.store.fulfillment.listCartOptions({ cart_id: cart.id })
      .then((r) => setOptions((r.shipping_options ?? []).map((o: any) => ({ id: o.id, name: o.name, amount: o.amount ?? 0 }))))
      .catch(() => setOptions([]));
  }, [cart]);

  if (!cart || (cart.items?.length ?? 0) === 0) {
    return <p className="rounded-lg border border-sage-200 bg-white p-10 text-center text-ink-muted">Your pre-order bag is empty.</p>;
  }
  if (cartTypeOf(cart) !== "preorder") {
    return (
      <p className="rounded-lg border border-sage-200 bg-white p-6 text-center text-ink">
        This is the pre-order checkout. <Link href="/checkout" className="text-sage-700 underline">Go to the in-stock checkout →</Link>
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateCheckout(state, { requireShipping: true });
    if (Object.keys(validation).length > 0 || !shippingOptionId) {
      setErrors(validation);
      if (!shippingOptionId) setBanner("Please choose a delivery method.");
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      const sdk = getCartSdk("preorder");
      const selected = options.find((o) => o.id === shippingOptionId);
      await sdk.store.cart.update(cart!.id, {
        email: state.email,
        shipping_address: toMedusaAddress(state),
        billing_address: toMedusaAddress(state),
        metadata: {
          ...(cart!.metadata ?? {}),
          notes: state.notes || undefined,
          delivery_method: selected?.name ?? null,
        },
      });
      await sdk.store.cart.addShippingMethod(cart!.id, { option_id: shippingOptionId! });
      await sdk.store.payment.initiatePaymentSession(cart!, { provider_id: PREORDER_PAYMENT_PROVIDER_ID });
      const result = await sdk.store.cart.complete(cart!.id);
      if (result.type !== "order") {
        throw new Error(result.error?.message ?? "Order could not be completed");
      }
      clearCart();
      router.push(`/preorder/checkout/success?order=${result.order.id}`);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Couldn't place your reservation. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {banner && <div role="alert" className="rounded border border-coral-300 bg-coral-50 px-4 py-3 text-sm text-coral-700">{banner}</div>}
        <CheckoutFields state={state} errors={errors} accent="sage"
          onChange={(f, v) => setState((s) => ({ ...s, [f]: v }))}
          onBlur={() => {}} />
        <fieldset className="rounded-lg border border-sage-200 bg-white p-5">
          <legend className="px-1 text-sm font-semibold text-ink">Delivery method</legend>
          <div className="mt-2 space-y-2">
            {options.map((o) => (
              <label key={o.id} className="flex items-center justify-between rounded border border-sage-100 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <input type="radio" name="ship" value={o.id} checked={shippingOptionId === o.id} onChange={() => setShippingOptionId(o.id)} />
                  {o.name}
                </span>
                <span>Rs {o.amount.toLocaleString("en-MU")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={submitting}
          className="w-full rounded bg-sage-700 px-4 py-3 text-sm font-semibold text-cream hover:bg-sage-900 disabled:opacity-60">
          {submitting ? "Placing reservation…" : "Place reservation"}
        </button>
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start"><PreorderOrderSummary cart={cart} /></div>
    </form>
  );
}
```

NOTE: confirm `validateCheckout` accepts a `{ requireShipping }` option; if its real signature differs, call it as apex does and gate shipping separately. Confirm `toMedusaAddress` field names against `lib/checkout.ts` before relying on them.

- [ ] **Step 2: Type-check + build**

Run: `cd DUB-front && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd DUB-front
git add "src/app/(preorder)/preorder/checkout/PreorderCheckoutForm.tsx"
git commit -m "feat: pre-order checkout form (submit creates real Medusa order)"
```

### Task 6: Stamp deposit lifecycle metadata on order.placed

**Files:**
- Create: `Backend/dollup-medusa/src/subscribers/preorder-stamp-on-order-placed.ts`
- Read first: `Backend/dollup-medusa/src/subscribers/email-on-order-placed.ts` (retrieveOrder + totals gotcha), `Backend/dollup-medusa/src/lib/preorder-deposit.ts` (Task 2).

- [ ] **Step 1: Write the subscriber**

Detects preorder orders (`metadata.cart_type === "preorder"`), computes deposit, stamps lifecycle. Runs synchronously in the same `order.placed` event so metadata is present before the customer hits the success page (success page fetch is a few hundred ms later).

```ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import { computeDeposit } from "../lib/preorder-deposit"

const DEPOSIT_WINDOW_MS = 24 * 60 * 60 * 1000

export default async function preorderStampOnOrderPlaced({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) return
  try {
    const orderService = container.resolve(Modules.ORDER)
    const order = (await orderService.retrieveOrder(orderId, {
      select: ["id", "item_total", "shipping_total", "metadata"],
    })) as unknown as {
      item_total?: number | null
      shipping_total?: number | null
      metadata?: Record<string, unknown> | null
    }
    const meta = (order.metadata ?? {}) as Record<string, unknown>
    if (meta.cart_type !== "preorder") return // not a preorder; leave untouched
    if (meta.preorder_status) return // idempotent — already stamped

    const { total, deposit, balance } = computeDeposit(
      Number(order.item_total ?? 0),
      Number(order.shipping_total ?? 0),
    )
    const deadlineMs = event.metadata?.now // not available; compute from Date
    const deadline = new Date(Date.now() + DEPOSIT_WINDOW_MS).toISOString()

    await updateOrderWorkflow(container as never).run({
      input: {
        id: orderId,
        user_id: "system",
        metadata: {
          ...meta,
          preorder_status: "awaiting_deposit",
          total_amount: total,
          deposit_amount: deposit,
          balance_amount: balance,
          deposit_deadline: deadline,
          reminder_sent: false,
          deposit_paid_at: null,
        },
      },
    })
    logger.info(`[preorder-stamp] order ${orderId} → awaiting_deposit, deposit ${deposit}`)
  } catch (err) {
    logger.error(`[preorder-stamp] failed for ${orderId}: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "preorder-stamp-on-order-placed" },
}
```

NOTE: verify `updateOrderWorkflow` is the correct core-flow for setting order metadata in v2.13.1 (alternative: `orderService.updateOrders([{ id, metadata }])` directly on the module service). Use whichever the codebase already uses for order edits; prefer the module-service call if the workflow requires more inputs. The `user_id: "system"` field may be unnecessary — drop if the workflow rejects it.

- [ ] **Step 2: Build the backend**

Run: `cd Backend/dollup-medusa && yarn build`
Expected: compiles.

- [ ] **Step 3: TRACER-BULLET LIVE SMOKE (manual)**

1. `cd Backend/dollup-medusa && yarn dev` (or use the deployed backend).
2. On `preorder.localhost:3000` (or the deployed preorder host) add a preorder product, open cart, click "Proceed to Checkout".
3. Confirm it lands on `/preorder/checkout` (NOT a 404).
4. Fill the form, pick a delivery method, "Place reservation".
5. Confirm redirect to `/preorder/checkout/success?order=<id>`.
6. In Medusa admin (`/app/orders/<id>`), confirm `metadata.preorder_status="awaiting_deposit"`, `deposit_amount`/`balance_amount`/`total_amount` correct, `deposit_deadline` ~24h out.

Expected: all six pass. **This is the tracer bullet — a real preorder order exists with correct deposit metadata.**

- [ ] **Step 4: Commit**

```bash
cd Backend/dollup-medusa
git add src/subscribers/preorder-stamp-on-order-placed.ts
git commit -m "feat: stamp deposit lifecycle metadata on preorder order.placed"
```

### Task 7: Cart drawer link by cart type

**Files:**
- Modify: `DUB-front/src/components/cart/CartDrawer.tsx`

- [ ] **Step 1: Add cart-type-aware link**

At top of `CartDrawer`, import `cartTypeOf` and compute the target:
```tsx
import { cartTypeOf } from "@/lib/cart-type";
// ...inside component, after `const items = ...`:
const checkoutHref = cartTypeOf(cart) === "preorder" ? "/preorder/checkout" : "/checkout";
```
Change the existing `<Link href="/checkout" ...>` to `<Link href={checkoutHref} ...>`.

- [ ] **Step 2: Type-check + build**

Run: `cd DUB-front && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Verify both hosts (manual)**

- Apex cart → drawer link points to `/checkout`.
- Preorder cart → drawer link points to `/preorder/checkout`.

- [ ] **Step 4: Commit**

```bash
cd DUB-front
git add src/components/cart/CartDrawer.tsx
git commit -m "fix: cart drawer checkout link follows cart type (preorder vs apex)"
```

---

## Phase 3: Success page + emails

### Task 8: Pre-order success page

**Files:**
- Create: `DUB-front/src/app/(preorder)/preorder/checkout/success/page.tsx`
- Read first: `DUB-front/src/app/checkout/success/page.tsx` (searchParams is `Promise<{}>` in Next 16), `DUB-front/src/lib/payment-info.ts`, `DUB-front/src/lib/medusa-preorder.ts` (preorderSdk for fetching the order if needed — but order detail needs auth; prefer reading deposit values passed via the order's metadata fetched server-side with admin, OR just recompute from query params).

- [ ] **Step 1: Decide data source**

The success page cannot read order metadata without auth. Pass the deposit number forward: append `&deposit=<amount>` when redirecting in Task 5 (`router.push(.../success?order=<id>&deposit=<deposit>)`). Update Task 5's push accordingly during this task. Display the order id + deposit + Juice details + deadline copy.

- [ ] **Step 2: Write the page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PAYMENT_INFO } from "@/lib/payment-info";

export const metadata: Metadata = { title: "Reservation placed", robots: { index: false, follow: false } };

export default async function PreorderSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; deposit?: string }> }) {
  const { order, deposit } = await searchParams;
  const depositNum = Number(deposit ?? 0);
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sage-700">Reservation placed</p>
      <h1 className="mt-3 font-display text-4xl text-ink">Thank you — you&apos;re almost set.</h1>
      <p className="mt-4 text-ink-soft">Order <strong>#{order ?? "—"}</strong>. To confirm your reservation, pay your 75% deposit within <strong>24 hours</strong>.</p>
      <div className="mt-8 rounded-lg border border-sage-200 bg-white p-6 text-left">
        <h2 className="font-display text-xl text-ink">Pay your deposit</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Deposit due now</dt><dd className="font-semibold">Rs {depositNum.toLocaleString("en-MU")}</dd></div>
          <div className="flex justify-between"><dt>Bank</dt><dd>{PAYMENT_INFO.bank}</dd></div>
          <div className="flex justify-between"><dt>Account name</dt><dd>{PAYMENT_INFO.account_name}</dd></div>
          <div className="flex justify-between"><dt>Account number</dt><dd className="font-mono">{PAYMENT_INFO.account_number}</dd></div>
        </dl>
        <p className="mt-4 text-[13px] text-ink-muted">Send your transfer screenshot on WhatsApp: <span className="font-mono">{PAYMENT_INFO.whatsapp}</span>. We&apos;ve emailed you a copy of these details.</p>
      </div>
      <Link href="/preorder/products" className="mt-8 inline-block rounded-full bg-sage-700 px-5 py-3 text-[13px] font-semibold text-cream hover:bg-sage-900">Keep browsing pre-order</Link>
    </main>
  );
}
```

- [ ] **Step 3: Update Task 5 redirect to include deposit**

In `PreorderCheckoutForm.handleSubmit`, compute `const { deposit } = computeDeposit(itemTotal, shipping)` from the cart before completing and push `?order=${result.order.id}&deposit=${deposit}`.

- [ ] **Step 4: Type-check + build**

Run: `cd DUB-front && npx tsc --noEmit && npm run build`
Expected: no errors; `/preorder/checkout/success` route present.

- [ ] **Step 5: Commit**

```bash
cd DUB-front
git add "src/app/(preorder)/preorder/checkout/success" "src/app/(preorder)/preorder/checkout/PreorderCheckoutForm.tsx"
git commit -m "feat: pre-order success page with deposit instructions"
```

### Task 9 (optional, low risk): Refactor apex CheckoutForm to use CheckoutFields

**Files:**
- Modify: `DUB-front/src/app/checkout/CheckoutForm.tsx`

- [ ] **Step 1:** Replace the inline contact/address inputs with `<CheckoutFields accent="coral" .../>`, wiring the existing `state`/`errors`/handlers. Behavior-preserving.
- [ ] **Step 2:** Run apex checkout smoke (add in-stock item → /checkout → place order → success). Expected: unchanged behavior.
- [ ] **Step 3:** `npx tsc --noEmit && npm run build`. Commit: `refactor: apex checkout uses shared CheckoutFields`.

> Skip if time-constrained — the two forms can coexist; this just prevents drift.

### Task 10: Email templates + register + fork order-placed emails

**Files:**
- Create: `Backend/dollup-medusa/src/modules/notification-resend/templates/preorder-deposit-instructions.tsx`
- Create: `Backend/dollup-medusa/src/modules/notification-resend/templates/preorder-deposit-confirmed.tsx`
- Create: `Backend/dollup-medusa/src/modules/notification-resend/templates/preorder-reservation-expired.tsx`
- Modify: `Backend/dollup-medusa/src/modules/notification-resend/service.ts`
- Modify: `Backend/dollup-medusa/src/subscribers/email-on-order-placed.ts`
- Read first: `service.ts` (EmailTemplate enum + renderers map), `templates/order-placed.tsx` + `_layout.tsx` (template shape), `templates/cart-recovery-coupon.tsx` (a simpler reference).

- [ ] **Step 1: Add enum entries + renderers**

In `service.ts`, extend `EmailTemplate`:
```ts
  PREORDER_DEPOSIT_INSTRUCTIONS = "preorder-deposit-instructions",
  PREORDER_DEPOSIT_CONFIRMED = "preorder-deposit-confirmed",
  PREORDER_RESERVATION_EXPIRED = "preorder-reservation-expired",
```
Add three entries to the `renderers` record pointing at the new template default exports (mirror the existing `[EmailTemplate.ORDER_PLACED]: (data) => OrderPlacedEmail(data as ...)` lines).

- [ ] **Step 2: Write the three templates**

Each uses `_layout.tsx`. Data shapes:
```ts
export type PreorderDepositInstructionsData = {
  customerFirstName: string; displayId: string | number;
  depositAmount: number; balanceAmount: number; totalAmount: number;
  deadlineLabel: string; // e.g. "30 May 2026, 2:00pm"
  bank: string; accountName: string; accountNumber: string; whatsapp: string;
};
export type PreorderDepositConfirmedData = { customerFirstName: string; displayId: string | number; balanceAmount: number };
export type PreorderReservationExpiredData = { customerFirstName: string; displayId: string | number };
```
Write each as a React Email component mirroring `order-placed.tsx` structure (sage accent acceptable; reuse `_layout`). Show the Juice details + deadline in the instructions template.

- [ ] **Step 3: Fork the order-placed email subscriber**

In `email-on-order-placed.ts`, after loading `metadata`, short-circuit preorder orders so they DON'T get the standard confirmation (the preorder-specific email is sent by the stamp subscriber — see Step 4):
```ts
    if ((metadata.cart_type as string) === "preorder") {
      // Preorder deposit email is handled by preorder-stamp-on-order-placed.
      return
    }
```

- [ ] **Step 4: Send deposit-instructions email from the stamp subscriber**

In `preorder-stamp-on-order-placed.ts` (Task 6), after stamping, resolve the notification service and send `PREORDER_DEPOSIT_INSTRUCTIONS` to `order.email`, CC `eabmarkets@gmail.com`. Add `email` + `shipping_address.first_name` + `display_id` to the `retrieveOrder` select/relations. Use `notificationService.createNotifications({ to, channel: "email", template: EmailTemplate.PREORDER_DEPOSIT_INSTRUCTIONS, data })`. For the owner CC, send a second `createNotifications` to `eabmarkets@gmail.com` (Resend has no cc field in this wrapper — send a duplicate).

- [ ] **Step 5: Build**

Run: `cd Backend/dollup-medusa && yarn build`
Expected: compiles.

- [ ] **Step 6: Live smoke**

Place a preorder (as Task 6 smoke). Confirm: customer receives deposit-instructions email; `eabmarkets@gmail.com` receives a copy; the standard order-placed email is NOT sent for the preorder. Apex order still gets its normal email.

- [ ] **Step 7: Commit**

```bash
cd Backend/dollup-medusa
git add src/modules/notification-resend/templates src/modules/notification-resend/service.ts src/subscribers/email-on-order-placed.ts src/subscribers/preorder-stamp-on-order-placed.ts
git commit -m "feat: preorder deposit emails (instructions + owner CC), skip standard confirmation"
```

### Task 11: Fork Telegram notification for preorder

**Files:**
- Modify: `Backend/dollup-medusa/src/subscribers/telegram-on-order-placed.ts`

- [ ] **Step 1: Branch the message by preorder_status**

After computing `metadata`, if `metadata.cart_type === "preorder"`, build a preorder-flavored message instead of the standard one:
```ts
    const isPreorder = metadata.cart_type === "preorder"
    // ...
    if (isPreorder) {
      lines.length = 0
      lines.push(`🟣 <b>NEW PRE-ORDER #${order.display_id ?? order.id}</b>`)
      lines.push("")
      lines.push(`👤 ${escapeHtml(customer)}`)
      if (order.email) lines.push(`✉️ ${escapeHtml(order.email)}`)
      if (addr.phone) lines.push(`📞 ${escapeHtml(addr.phone)}`)
      lines.push("")
      lines.push(`💰 Total: ${formatMUR(Number(metadata.total_amount ?? total))}`)
      lines.push(`🔸 Deposit due (75%): <b>${formatMUR(Number(metadata.deposit_amount ?? 0))}</b>`)
      lines.push(`🔹 Balance on arrival: ${formatMUR(Number(metadata.balance_amount ?? 0))}`)
      lines.push(`⏳ Deposit deadline: 24h`)
      lines.push("")
      lines.push(`🔗 <a href="${ADMIN_URL}/orders/${order.id}">Open in admin</a>`)
    }
```
NOTE: `metadata.deposit_amount` is stamped by the stamp subscriber, which also runs on `order.placed`. Subscriber ordering is not guaranteed; if the Telegram fires before the stamp, `deposit_amount` may be absent → it falls back to recomputing inline. Add the same `computeDeposit` fallback import to be safe:
```ts
import { computeDeposit } from "../lib/preorder-deposit"
// when isPreorder and metadata.deposit_amount missing:
const dep = metadata.deposit_amount != null ? Number(metadata.deposit_amount)
  : computeDeposit(Number(order.item_total ?? order.subtotal ?? 0), Number(order.shipping_total ?? 0)).deposit
```

CONSISTENCY: the stamp subscriber (Task 6) computes the deposit from
`order.item_total` + `order.shipping_total`. Use the SAME base fields here so
the fallback never diverges from the stamped value. Add `item_total`,
`subtotal`, `shipping_total` to this subscriber's `retrieveOrder` select.

- [ ] **Step 2: Build**

Run: `cd Backend/dollup-medusa && yarn build`
Expected: compiles.

- [ ] **Step 3: Live smoke**

Place a preorder; confirm the Telegram ping reads "NEW PRE-ORDER" with deposit line. Place an apex order; confirm it still reads "NEW ORDER".

- [ ] **Step 4: Commit**

```bash
cd Backend/dollup-medusa
git add src/subscribers/telegram-on-order-placed.ts
git commit -m "feat: preorder-flavored Telegram order notification"
```

---

## Phase 4: Lifecycle cron (reminder + auto-cancel)

### Task 12: Deposit cleanup cron

**Files:**
- Create: `Backend/dollup-medusa/src/jobs/preorder-deposit-cleanup.ts`
- Read first: `Backend/dollup-medusa/src/jobs/preorder-availability-check.ts` (job config + query.graph + updateProductsWorkflow + sendTelegram), `Backend/dollup-medusa/src/lib/telegram.ts`.

- [ ] **Step 1: Write the job**

Runs every 15 min. For preorder orders with `preorder_status === "awaiting_deposit"`:
- if `now >= deadline` → cancel order, set `preorder_status="expired"`, send reservation-expired email.
- else if `now >= deadline - 1h` and `!reminder_sent` → send reminder email + set `reminder_sent=true`.
All transitions are idempotent (guarded on current status / flag).

```ts
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow, updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import type { INotificationModuleService } from "@medusajs/framework/types"
import { EmailTemplate } from "../modules/notification-resend/service"

const REMINDER_LEAD_MS = 60 * 60 * 1000

export default async function preorderDepositCleanup(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = container.resolve(Modules.ORDER)
  const notify = container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata", "shipping_address.first_name"],
    // No metadata filter operator in query.graph; fetch recent + filter in JS.
    pagination: { take: 500, order: { created_at: "DESC" } },
  })

  const now = Date.now()
  let reminded = 0, expired = 0
  for (const o of orders as any[]) {
    const meta = o.metadata ?? {}
    if (meta.cart_type !== "preorder") continue
    if (meta.preorder_status !== "awaiting_deposit") continue
    const deadline = meta.deposit_deadline ? Date.parse(meta.deposit_deadline) : NaN
    if (!Number.isFinite(deadline)) continue
    const first = o.shipping_address?.first_name ?? ""

    if (now >= deadline) {
      try {
        await cancelOrderWorkflow(container as never).run({ input: { id: o.id } })
      } catch (e) { logger.warn(`[preorder-cleanup] cancel failed ${o.id}: ${(e as Error).message}`) }
      await updateOrderWorkflow(container as never).run({
        input: { id: o.id, metadata: { ...meta, preorder_status: "expired" } },
      })
      if (o.email) {
        await notify.createNotifications({
          to: o.email, channel: "email",
          template: EmailTemplate.PREORDER_RESERVATION_EXPIRED,
          data: { customerFirstName: first, displayId: o.display_id ?? o.id } as any,
        }).catch(() => {})
      }
      expired++
      continue
    }
    if (now >= deadline - REMINDER_LEAD_MS && !meta.reminder_sent) {
      if (o.email) {
        await notify.createNotifications({
          to: o.email, channel: "email",
          template: EmailTemplate.PREORDER_DEPOSIT_INSTRUCTIONS,
          data: {
            customerFirstName: first, displayId: o.display_id ?? o.id,
            depositAmount: Number(meta.deposit_amount ?? 0),
            balanceAmount: Number(meta.balance_amount ?? 0),
            totalAmount: Number(meta.total_amount ?? 0),
            deadlineLabel: new Date(deadline).toLocaleString("en-MU"),
            // bank/account/whatsapp filled from PAYMENT_INFO equivalents — see note
          } as any,
        }).catch(() => {})
      }
      await updateOrderWorkflow(container as never).run({
        input: { id: o.id, metadata: { ...meta, reminder_sent: true } },
      })
      reminded++
    }
  }
  logger.info(`[preorder-cleanup] reminded=${reminded} expired=${expired}`)
}

export const config = {
  name: "preorder-deposit-cleanup",
  schedule: "*/15 * * * *",
}
```

NOTE: payment account details (bank/account/whatsapp) live in frontend `payment-info.ts`. Create a backend equivalent `src/lib/payment-info.ts` with the same constants (MCB / 000446948071 / +230 5941 6359) and import it in both the stamp subscriber (Task 10 Step 4) and this cron, so the email template always has them. Confirm `cancelOrderWorkflow` is the right core-flow name in 2.13.1; if cancellation requires the order not be fulfilled (it won't be), it should succeed. If `cancelOrderWorkflow` rejects an unpaid order, fall back to just setting `preorder_status="expired"` without a hard cancel and let the owner cancel in admin.

- [ ] **Step 2: Build**

Run: `cd Backend/dollup-medusa && yarn build`
Expected: compiles.

- [ ] **Step 3: Smoke (accelerated)**

Temporarily set a test order's `metadata.deposit_deadline` to 30 min in the future (via admin), wait for the cron (or invoke the job manually with `yarn medusa exec`), confirm reminder email + `reminder_sent=true`. Then set deadline to the past, confirm cancel + `expired` + expired email.

- [ ] **Step 4: Commit**

```bash
cd Backend/dollup-medusa
git add src/jobs/preorder-deposit-cleanup.ts src/lib/payment-info.ts
git commit -m "feat: preorder deposit cleanup cron (23h reminder, 24h auto-cancel)"
```

---

## Phase 5: Backend admin API for the orders view

### Task 13: Admin preorder-orders list + mark-paid routes

**Files:**
- Create: `Backend/dollup-medusa/src/api/admin/preorder-orders/route.ts`
- Create: `Backend/dollup-medusa/src/api/admin/preorder-orders/[id]/mark-paid/route.ts`
- Read first: an existing custom admin route (e.g. `src/api/admin/abandoned-carts/route.ts` if present, else `src/api/admin/custom/route.ts`) for the `GET`/`POST` export shape + auth (admin routes are auth-gated by default).

- [ ] **Step 1: GET list route**

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "display_id", "email", "created_at", "metadata",
      "items.title", "items.quantity", "items.thumbnail", "items.unit_price",
      "shipping_address.first_name", "shipping_address.last_name",
      "shipping_address.phone", "shipping_address.city", "shipping_address.address_1",
    ],
    pagination: { take: 500, order: { created_at: "DESC" } },
  })
  const preorders = (orders as any[]).filter((o) => o.metadata?.cart_type === "preorder")
  res.json({ orders: preorders })
}
```

- [ ] **Step 2: POST mark-paid route**

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import type { INotificationModuleService } from "@medusajs/framework/types"
import { EmailTemplate } from "../../../../modules/notification-resend/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const orderService = req.scope.resolve(Modules.ORDER)
  const order = (await orderService.retrieveOrder(orderId, {
    select: ["id", "display_id", "email", "metadata"],
    relations: ["shipping_address"],
  })) as any
  const meta = order.metadata ?? {}
  if (meta.cart_type !== "preorder") { res.status(400).json({ error: "Not a preorder" }); return }
  if (meta.preorder_status === "deposit_paid") { res.json({ ok: true, already: true }); return }

  await updateOrderWorkflow(req.scope as never).run({
    input: { id: orderId, metadata: { ...meta, preorder_status: "deposit_paid", deposit_paid_at: new Date().toISOString() } },
  })

  const notify = req.scope.resolve<INotificationModuleService>(Modules.NOTIFICATION)
  if (order.email) {
    await notify.createNotifications({
      to: order.email, channel: "email",
      template: EmailTemplate.PREORDER_DEPOSIT_CONFIRMED,
      data: { customerFirstName: order.shipping_address?.first_name ?? "", displayId: order.display_id ?? order.id, balanceAmount: Number(meta.balance_amount ?? 0) } as any,
    }).catch(() => {})
  }
  res.json({ ok: true })
}
```

- [ ] **Step 3: Build + verify route exists**

Run: `cd Backend/dollup-medusa && yarn build`
Then with an admin token: `GET /admin/preorder-orders` returns `{ orders: [...] }` (the test order from earlier). `POST /admin/preorder-orders/<id>/mark-paid` flips status + sends confirmed email.

- [ ] **Step 4: Commit**

```bash
cd Backend/dollup-medusa
git add src/api/admin/preorder-orders
git commit -m "feat: admin API — list preorder orders + mark deposit paid"
```

---

## Phase 6: Admin orders view (SUBAGENT)

### Task 14: dollup-admin pre-order orders view

> **Dispatch a subagent for this entire task.** It is self-contained: build the admin UI against the `/admin/preorder-orders` API from Task 13. Give the subagent: this task, the API shape from Task 13, and the read-first list below.

**Files:**
- Create: `dollup-admin/src/lib/admin-preorder-orders.ts`
- Create: `dollup-admin/src/app/(app)/preorder/orders/page.tsx`
- Create: `dollup-admin/src/app/(app)/preorder/orders/PreorderOrdersClient.tsx`
- Create: `dollup-admin/src/app/(app)/preorder/orders/actions.ts`
- Create: `dollup-admin/src/app/(app)/preorder/layout.tsx`
- Modify: `dollup-admin/src/components/AdminNavLinks.tsx` (optional — Pre-Order already links to `/preorder`; sub-nav handles Products|Orders)
- Read first (subagent): `dollup-admin/src/lib/medusa-admin.ts` (getAdminSdk), `dollup-admin/src/lib/admin-abandoned-carts.ts` (a fetch+shape client to mirror), `dollup-admin/src/app/(app)/preorder/page.tsx` (existing products page header style), `dollup-admin/src/app/(app)/orders/components/StatusBadge.tsx` (badge pattern).

- [ ] **Step 1: Sub-nav layout**

Create `preorder/layout.tsx` with a Products | Orders tab bar (links `/preorder` and `/preorder/orders`), rendering `children` below. Use `usePathname` for active state (mirror existing tab patterns; sage accent).

- [ ] **Step 2: Data client**

`admin-preorder-orders.ts`:
```ts
import "server-only";
import { getAdminSdk } from "./medusa-admin";

export type PreorderOrder = {
  id: string; display_id: number | string; email: string | null; created_at: string;
  metadata: Record<string, unknown>;
  items: { title: string; quantity: number; thumbnail: string | null; unit_price: number }[];
  shipping_address: { first_name?: string; last_name?: string; phone?: string; city?: string; address_1?: string } | null;
};

export async function listPreorderOrders(): Promise<PreorderOrder[]> {
  const sdk = await getAdminSdk();
  const r = await sdk.client.fetch<{ orders: PreorderOrder[] }>("/admin/preorder-orders", { method: "GET" });
  return r.orders ?? [];
}
```

- [ ] **Step 3: Server action for mark-paid**

`actions.ts`:
```ts
"use server";
import { getAdminSdk } from "@/lib/medusa-admin";
import { revalidatePath } from "next/cache";

export async function markDepositPaid(orderId: string) {
  const sdk = await getAdminSdk();
  await sdk.client.fetch(`/admin/preorder-orders/${orderId}/mark-paid`, { method: "POST" });
  revalidatePath("/preorder/orders");
}
```

- [ ] **Step 4: Page + client**

`page.tsx` (server) fetches `listPreorderOrders()`, groups by `metadata.preorder_status` into `awaiting_deposit` / `deposit_paid` / `expired`, passes to `PreorderOrdersClient`. Client renders three status sections (awaiting expanded by default), each row showing order #, customer, items, deposit amount, and (for awaiting) a deadline countdown + **[Mark deposit received]** button (calls `markDepositPaid`), a **Copy WhatsApp reminder** button (builds a `wa.me` link with the deposit amount), and a Cancel link to the Medusa admin order. Sage-tinted to distinguish from coral in-stock orders. Empty state mirrors the products page.

- [ ] **Step 5: Type-check + build**

Run: `cd dollup-admin && npx tsc --noEmit && npm run build`
Expected: no errors; `/preorder/orders` route present.

- [ ] **Step 6: Live smoke**

Open `/preorder/orders` in the deployed admin. The test order appears under "Awaiting deposit" with a countdown. Click "Mark deposit received" → moves to "Deposit paid", customer gets the confirmed email.

- [ ] **Step 7: Commit**

```bash
cd dollup-admin
git add "src/app/(app)/preorder" src/lib/admin-preorder-orders.ts src/components/AdminNavLinks.tsx
git commit -m "feat: admin pre-order orders view (deposit lifecycle, sage-tinted)"
```

---

## Final verification (whole feature)

- [ ] Apex `/checkout` works unchanged (in-stock COD order + standard email + standard Telegram).
- [ ] Preorder host: drawer "Proceed to Checkout" → `/preorder/checkout` (NOT 404).
- [ ] Place preorder → success page shows order # + correct deposit + Juice details.
- [ ] Medusa admin: order has `preorder_status="awaiting_deposit"` + correct amounts + ~24h deadline.
- [ ] Customer deposit email + owner CC received; standard confirmation NOT sent for preorder.
- [ ] Telegram ping reads "NEW PRE-ORDER" with deposit.
- [ ] dollup-admin `/preorder/orders`: order under Awaiting; "Mark deposit received" → Deposit paid + confirmed email.
- [ ] Cron: past-deadline order → canceled + expired email; near-deadline → one reminder.
- [ ] Pre-order shipping prices are 150/70/100/0 (Phase 0).

---

## Notes / risks carried from spec

- **Subscriber ordering** (`order.placed` fires both stamp + telegram): Telegram has a `computeDeposit` fallback so it's correct regardless of order.
- **Workflow names** (`updateOrderWorkflow`, `cancelOrderWorkflow`): verify against 2.13.1 core-flows during first backend task; fall back to direct `orderService.updateOrders([...])` for metadata if the workflow signature differs.
- **`validateCheckout` / `toMedusaAddress` signatures**: confirm against `lib/checkout.ts` in Task 5 before relying on the `{ requireShipping }` option.
- **Success page deposit source**: passed via query param (page can't read order metadata without auth) — acceptable for display-only; the email is the durable record.
- **MUR whole-rupee assumption**: verified via real product prices (800/1100/890). All math uses raw units.
