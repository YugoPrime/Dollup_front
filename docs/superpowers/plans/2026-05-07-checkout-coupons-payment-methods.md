# 2026-05-07 — Checkout: cart-attribution fix, coupons, payment methods, order recovery

Self-contained plan covering everything raised in the 2026-05-07 checkout debugging session.
Do these in order — earlier items unblock later ones (especially #1).

---

## 0. Current state snapshot (read first)

- DUB-front `master` has commit **`c4a67b6`** committed locally but **NOT pushed** to origin.
  - File: `DUB-front/src/lib/auth-client.ts`
  - Fix: `init()` now calls `attachStoredCartToCustomer()` so a returning user with a JWT in localStorage gets their stale cart re-bound on page load. Without this, the cart's `customer_id` keeps pointing at a prior session's customer, which causes both the loyalty 403 and the "order doesn't appear in my account" bug.
  - Push was blocked by the direct-to-master hook. User will start a new terminal session and push or grant permission.
- Medusa backend (`Backend/dollup-medusa/`) — no pending changes.
- dollup-admin — no pending changes.

---

## 1. Push the cart-attribution fix (BLOCKING — do first)

```bash
cd "DUB-front"
git log --oneline -3            # confirm c4a67b6 is on top of master
git push origin master
```

Coolify auto-deploys `master` to `shop.dollupboutique.com`. Wait for the build to finish before smoke-testing.

**Smoke-test after deploy:**
1. Log out, clear `localStorage` for `shop.dollupboutique.com`, close/reopen tab.
2. Log in. Confirm `/account` loads.
3. Add a product → `/checkout`.
4. Open DevTools → Application → Local Storage. Note the value of `dub_cart_id`.
5. In Medusa admin (`/app/carts/<id>` or via DB), confirm that cart's `customer_id` matches your `cus_*`.
6. On `/checkout`, the loyalty box should show preview without 403.

If step 5 still shows mismatch, the fix didn't deploy. Check Coolify logs.

---

## 2. Loyalty "Max 0 pts allowed" — config check, not a code bug

**Symptom:** loyalty preview returns `max_redeemable: 0` even when balance is 100.

**Root cause candidates** (ordered by likelihood) — see `Backend/dollup-medusa/src/workflows/apply-loyalty-discount.ts:108-122`:

1. `settings.min_redeem_points > pointsBalance` (e.g. min is 200, user has 100). Function short-circuits to 0.
2. Cart `subtotal <= 0` (cart empty/uninitialized).
3. `redeem_rate_mur_per_100_pts <= 0` (settings misconfigured).
4. 50%-of-subtotal cap rounds the cap below `min_redeem_points`. Example: subtotal Rs 500, half = Rs 250, at rate 50 MUR per 100 pts → cap = 500 pts. If min is 100, fine. But at rate 500 MUR per 100 pts → cap = 50 pts; if min ≥ 100 → returns 0.

**How to fix:**

- Open dollup-admin `/settings/loyalty` (or hit `GET /admin/loyalty/settings` directly in Medusa admin).
- Adjust `min_redeem_points` and `redeem_rate_mur_per_100_pts` so a 100-pt customer can redeem with a small cart.
- Re-test on `/checkout`.

No code change required unless settings already look right — in that case, add a `console.log` of `{ pointsBalance, subtotalMur, settings }` in `redeem-preview/route.ts` and re-check.

---

## 3. Coupon / promo code feature

### 3.1 Backend (dollup-medusa)

**Don't build a parallel discount system.** Medusa v2's Promotion module already does this:
- Promo codes are first-class entities (`promotion` + `promotion_rule`).
- Cart route `POST /store/carts/:id` already accepts `promo_codes: string[]` and applies them via the `updateCartPromotionsWorkflow`.
- Discount lands in `cart.discount_total`, line-level adjustments, and survives through `complete-cart` so the order has the same discount and a record of the applied code(s).

**No backend code changes for the basic happy path.** Promotions are admin-managed in Medusa's built-in admin at `api.dollupboutique.com/app/promotions`.

If you want a custom storefront-facing apply/remove route (for cleaner errors), add `Backend/dollup-medusa/src/api/store/cart-promotions/route.ts` — but skip until you actually need it.

### 3.2 Frontend (DUB-front)

**File:** `DUB-front/src/app/checkout/OrderSummary.tsx` (the sticky right column already shows totals — promo input belongs here, above the totals block).

**State + UI:**

```tsx
"use client";
const [code, setCode] = useState("");
const [applying, setApplying] = useState(false);
const [error, setError] = useState<string | null>(null);

async function applyPromo() {
  if (!cart || !code.trim()) return;
  setApplying(true);
  setError(null);
  try {
    const existing = (cart.promotions ?? []).map((p) => p.code).filter(Boolean) as string[];
    await clientSdk.store.cart.update(cart.id, {
      promo_codes: [...existing, code.trim()],
    });
    await refreshCart();
    setCode("");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Invalid code.");
  } finally {
    setApplying(false);
  }
}

async function removePromo(promoCode: string) {
  if (!cart) return;
  const remaining = (cart.promotions ?? [])
    .map((p) => p.code)
    .filter((c): c is string => Boolean(c) && c !== promoCode);
  await clientSdk.store.cart.update(cart.id, { promo_codes: remaining });
  await refreshCart();
}
```

**UI shape** — match existing OrderSummary style (rounded-full input, coral button):
- Single input + "Apply" button (existing pattern from LoyaltyRedeemBox is the style reference)
- Below: list of applied codes with × to remove, plus the discount line
- On error: `text-coral-700` message below the input

**Cart fields** — extend `CART_FIELDS` in [DUB-front/src/components/cart/CartProvider.tsx:37-38](../../src/components/cart/CartProvider.tsx#L37-L38) to include `*promotions`:
```ts
const CART_FIELDS = "*items,...,*promotions,...";
```
(verify the exact relation field name in `node_modules/@medusajs/types/dist/http/cart/`).

**Show in OrderSummary totals:**
- Add a "Promo discount" line that reads `cart.discount_total` (or compute from promotion adjustments) and renders only when > 0.

### 3.3 Admin display (dollup-admin)

**File:** wherever the order-detail page lives in dollup-admin. (Search for the orders detail route — likely `dollup-admin/src/app/orders/[id]/page.tsx` or similar.)

Add to the order-detail view:
- "Promotions" section listing `order.promotions[].code` (or pull from order adjustments where `code` is the promo code)
- The discount line in the order-totals block

If dollup-admin currently reads orders via Medusa's `/admin/orders/:id`, request `fields=*promotions,*items.adjustments` so the data is there.

### 3.4 Verification

1. In Medusa admin `/app/promotions`, create a code (e.g. `WELCOME10` = 10% off, no rules).
2. On storefront checkout, type `WELCOME10` → Apply → totals drop by 10%.
3. Place a test order. Confirm in dollup-admin order detail that `WELCOME10` and the discount amount are visible.
4. `npx tsc --noEmit` in DUB-front, `yarn build` in dollup-medusa if any backend changes.

---

## 4. Payment method selection

### 4.1 Spec recap (from user)

| Delivery method                  | Allowed payment methods           |
|----------------------------------|-----------------------------------|
| Home Delivery, Office Pick Up    | Cash, Juice, Bank Transfer        |
| Postage, Express, Rodrigues      | Juice, Bank Transfer (no Cash)    |

On order success page:
- For Juice / Bank Transfer: show payment instructions (account / Juice number) + "send screenshot to WhatsApp +230 5941 6359".
- For Postage / Express / Rodrigues with non-cash: add prominent message **"Your order will be processed only when funds are received."**
- For Cash on Home/Pickup: standard COD copy.

Admin must show which payment method the customer chose.

### 4.2 Architecture decision

**No new Medusa payment provider.** Keep `pp_system_default` (manual / COD) as the only Medusa payment provider. Treat "payment method" as a customer-stated intent stored in `cart.metadata.payment_method` and copied to `order.metadata.payment_method` by the existing `complete-cart` flow (Medusa copies cart metadata to order metadata automatically).

Why: Real Medusa payment providers (Stripe etc.) require webhooks and capture flows. Juice and bank transfer here are offline / manual. Treating them as metadata keeps the integration simple and is reversible if you later add Stripe.

### 4.3 Frontend (DUB-front) — checkout form

**File:** `DUB-front/src/app/checkout/CheckoutForm.tsx`

**Add state:**
```ts
type PaymentMethod = "cash" | "juice" | "bank_transfer";
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
```

**Add a new section in the form** (between shipping and submit), conditionally rendered based on `deliveryMethod`:

```tsx
const allowedPaymentMethods: PaymentMethod[] =
  deliveryMethod === "home_delivery" || deliveryMethod === "pickup"
    ? ["cash", "juice", "bank_transfer"]
    : ["juice", "bank_transfer"];

// reset if delivery method changes and current selection no longer allowed
useEffect(() => {
  if (!allowedPaymentMethods.includes(paymentMethod)) {
    setPaymentMethod(allowedPaymentMethods[0]);
  }
}, [deliveryMethod]);
```

Render as radio cards (match the existing delivery-method selector styling):
- Cash on Delivery (only when allowed)
- Juice (MCB Juice mobile)
- Bank Transfer

For Juice / Bank Transfer, show a small inline note under the radio: *"Payment instructions will be shown after you place the order."*

**On submit (`handleSubmit`):**

Bundle into the existing `cart.update` metadata call. Today the form already writes `metadata.notes`, `metadata.delivery_method`, `metadata.delivery_date`. Add `metadata.payment_method`:

```ts
await clientSdk.store.cart.update(cart.id, {
  email,
  shipping_address,
  billing_address,
  metadata: {
    ...(notes ? { notes } : {}),
    delivery_method: deliveryMethod,
    delivery_date: deliveryDate,
    payment_method: paymentMethod,
  },
});
```

Continue with the existing flow — `addShippingMethod` → `initiatePaymentSession({ provider_id: "pp_system_default" })` → `cart.complete()`.

**Validation:**
- `paymentMethod` is required (never let it be empty)
- When delivery method changes, force-reset to a valid option (handled in the useEffect above)

### 4.4 Frontend — order success page

**File:** `DUB-front/src/app/checkout/success/page.tsx`

Today the page reads the order via `?order=<id>`. Pull `order.metadata` and branch on `payment_method`.

**New component:** `DUB-front/src/components/checkout/PaymentInstructions.tsx`

```tsx
type Props = {
  paymentMethod: "cash" | "juice" | "bank_transfer";
  deliveryMethod: string;
  orderId: string;
  totalLabel: string; // pre-formatted
};
```

Render logic:

- **Cash on Delivery (`cash`):**
  > "You'll pay cash when your order is delivered." + standard delivery copy.

- **Juice:**
  - Heading: "Pay via MCB Juice"
  - Juice number / merchant identifier (placeholder constants — see 4.6)
  - Amount: `totalLabel`
  - Reference: order ID
  - "After payment, send a screenshot to WhatsApp **+230 5941 6359**" — link should be `https://wa.me/23059416359?text=Order%20<orderId>%20payment%20screenshot`
  - If `deliveryMethod` is in `[postage, express, rodrigues]`: add a yellow/coral callout **"Your order will be processed only after funds are received."**

- **Bank Transfer:**
  - Heading: "Pay via Bank Transfer"
  - Bank name, account name, account number, branch (placeholder constants)
  - Amount + reference (order ID)
  - Same WhatsApp screenshot CTA
  - Same "processed only after funds received" callout for postage/express/rodrigues

### 4.5 Backend — surface `payment_method` on the order

No code change needed. Medusa's `complete-cart` flow copies cart metadata to order metadata. Verify by placing a test order and inspecting `order.metadata.payment_method` in Medusa admin.

If for some reason metadata doesn't carry over (Medusa v2 quirk):
- Add a subscriber `Backend/dollup-medusa/src/subscribers/copy-cart-metadata-to-order.ts` listening on `order.placed` that copies `cart.metadata` keys to `order.metadata`.

### 4.6 Where to store bank / Juice details

**Two options:**

- **Option A (ship faster):** hardcode constants in `DUB-front/src/lib/payment-info.ts`. Easy, but every change requires a deploy.
- **Option B (correct long-term):** store in dollup-admin `/settings/payment` (new page) → exposed via a public Medusa route `GET /store/payment-info` → fetched server-side on success page.

**Recommendation:** start with Option A using these placeholders, then migrate to B if user wants self-serve edits:

```ts
// DUB-front/src/lib/payment-info.ts
export const PAYMENT_INFO = {
  juice: {
    merchant_name: "Doll Up Boutique",
    juice_number: "<TO FILL>",   // user provides
  },
  bank: {
    bank_name: "<TO FILL>",
    account_name: "Doll Up Boutique",
    account_number: "<TO FILL>",
    branch: "<TO FILL>",
  },
  whatsapp: "+23059416359",
};
```

User must supply real numbers before this ships to production.

### 4.7 Admin display (dollup-admin)

**Files to edit:** the order-list and order-detail pages in dollup-admin.

- Order list: add a column "Payment" showing `metadata.payment_method` (formatted: Cash / Juice / Bank Transfer).
- Order detail: prominent block — payment method + a "Confirm payment received" button for Juice / Bank Transfer orders that toggles `metadata.payment_received_at` (so prep flow knows funds are in before processing).

If the prep page already gates on payment received (per the `dm_status` state machine memory), wire `payment_received_at` into that gate.

### 4.8 Verification

1. `tsc --noEmit` in DUB-front.
2. Manual smoke for each combination:
   - Home Delivery + Cash → success page shows COD copy.
   - Home Delivery + Juice → success page shows Juice instructions + WhatsApp link.
   - Postage + Bank Transfer → success page shows bank details + "processed only after funds received" callout.
   - Pickup + Cash → success page shows COD copy.
   - Express + Cash → form shouldn't allow it (Cash hidden).
3. In Medusa admin `/app/orders/<id>`, confirm `metadata.payment_method` is set.
4. In dollup-admin orders list, confirm column displays the choice.

---

## 5. Recover the lost order (the one not showing in user's account)

The order placed before fix `c4a67b6` was attached to whatever `cart.customer_id` happened to be — likely `null` or a stale customer. It will not appear in `/account` until relinked.

**Steps:**

1. In Medusa admin `/app/orders`, find the order by email or recent date.
2. Note the order's current `customer_id` and your real `cus_*` (visible at `/app/customers/<id>`).
3. Relink:
   - **Easy path:** if Medusa admin exposes "Transfer order to customer" — use it.
   - **Direct path:** SQL on the Postgres DB:
     ```sql
     UPDATE "order" SET customer_id = '<correct_cus_id>' WHERE id = '<order_id>';
     ```
     Coordinate with anything that caches order-customer links (Medusa's index module — may need a re-index).
4. Reload `/account/orders` on storefront — the order should now appear.

After commit `c4a67b6` is deployed, all new orders will get the right `customer_id` and this manual recovery won't be needed again.

---

## 6. Order of operations / handoff checklist

- [ ] **#1 Push `c4a67b6`** to `origin/master`, wait for Coolify deploy, smoke-test.
- [ ] **#2 Loyalty settings:** check `min_redeem_points` and `redeem_rate_mur_per_100_pts` in dollup-admin, adjust if needed.
- [ ] **#5 Recover lost order** via Medusa admin or direct SQL.
- [ ] **#4 Payment method selection** — frontend + admin display. Pre-req: collect real Juice number + bank details.
- [ ] **#3 Coupons** — frontend wiring + admin display.

Order-of-ops rationale: 1 unblocks everything. 2 + 5 are 5-minute admin/SQL tasks. 4 is a hard gate for non-COD orders the user wants live. 3 is "nice to have" and depends on Medusa promotions which are already there.

---

## 7. Files this plan touches

**Already changed (committed locally `c4a67b6`):**
- `DUB-front/src/lib/auth-client.ts`

**To change in #3 (coupons):**
- `DUB-front/src/app/checkout/OrderSummary.tsx` — promo input UI
- `DUB-front/src/components/cart/CartProvider.tsx` — extend `CART_FIELDS` to include `*promotions`
- dollup-admin order detail page — show applied promotions

**To change in #4 (payment method):**
- `DUB-front/src/app/checkout/CheckoutForm.tsx` — payment method selector
- `DUB-front/src/components/checkout/PaymentInstructions.tsx` — NEW
- `DUB-front/src/app/checkout/success/page.tsx` — render PaymentInstructions
- `DUB-front/src/lib/payment-info.ts` — NEW (or settings-fetched if going Option B)
- dollup-admin order list + detail — payment method column / block
- (optionally) `Backend/dollup-medusa/src/subscribers/copy-cart-metadata-to-order.ts` — only if metadata copy doesn't happen automatically

**No changes expected in:**
- Medusa loyalty workflow (#2 is config only)
- Medusa promotion module (using as-is)
