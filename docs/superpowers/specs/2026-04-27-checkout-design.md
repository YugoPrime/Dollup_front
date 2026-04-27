# Checkout — Design Spec

**Date:** 2026-04-27
**Status:** Approved
**Author:** Rahvi (with Claude)

## Goal

Let a Mauritius shopper place a cash-on-delivery (COD) order from the storefront. This is the missing link between the existing cart drawer ("Proceed to Checkout") and a real, completed Medusa order.

## Decisions (locked in)

| Decision | Choice |
|---|---|
| Payment | COD only — Medusa's manual payment provider (`pp_system_default`) |
| Flow | Single-page checkout, one scrollable form |
| Auth | Guest by default, optional "Create account" checkbox |
| Shipping | Mauritius only, flat rate, free over Rs.999 |
| Confirmation | Redirect to `/checkout/success?order=<id>` |

## Architecture

### Routes

- `/checkout` — the form (client component).
- `/checkout/success` — confirmation page; reads `?order=<id>` and fetches the order.

### State

- Cart already lives in `CartProvider` (localStorage `dub_cart_id`). `/checkout` reads from `useCart()` — no separate checkout context.
- After `cart.complete` succeeds: clear `dub_cart_id` *before* redirect, so the success page mounts with no cart.
- Empty cart on `/checkout` → friendly empty state, no hard redirect (preserves back-button).

### Medusa SDK calls

All client-side via `clientSdk.store.*`:

1. `cart.update(cartId, { email, shipping_address, billing_address })`
2. `cart.listShippingOptions(cartId)` → pick the flat-rate option
3. `cart.addShippingMethod(cartId, { option_id })`
4. `payment.initiatePaymentSession(cart, { provider_id: "pp_system_default" })`
5. `cart.complete(cartId)` → returns the order
6. *(opt-in)* `customer.create({ email, password, ... })` if "Create account" was ticked

### File layout

```
src/app/checkout/
  page.tsx                  // server: shell, renders <CheckoutForm />
  CheckoutForm.tsx          // client: the form
  success/page.tsx          // client: order summary + thank-you
src/lib/checkout.ts         // pure helpers: shipping-option pick, validation
```

> Before implementing, verify the App Router conventions in `node_modules/next/dist/docs/` — repo's `AGENTS.md` warns this Next.js version may differ from training data.

## The form (`/checkout`)

### Layout

- Desktop: two columns. Left = form. Right = sticky order summary card.
- Mobile: stacked, single column. "Place Order" button sticky to bottom of viewport.

### Fields

1. **Contact**
   - Email *(required)*
   - Phone *(required — courier calls before COD delivery)*
2. **Shipping address**
   - First name, Last name *(required)*
   - Address line 1 *(required)*
   - Address line 2 *(optional — apartment, landmark)*
   - City / Town *(required)*
   - Region — dropdown of MU districts: Port Louis, Pamplemousses, Rivière du Rempart, Flacq, Grand Port, Savanne, Plaines Wilhems, Moka, Black River, Rodrigues *(required)*
   - Postal code *(optional)*
   - Country — fixed to "Mauritius", read-only
3. **Billing address**
   - Checkbox "Same as shipping" (default ON). Unticking reveals a duplicate address block.
4. **Shipping method** — radio group populated from `listShippingOptions`. With one option configured, single pre-selected row showing "Standard shipping — Rs.150" or "Free shipping" depending on subtotal.
5. **Order notes** *(optional textarea — landmark, delivery instructions)*
6. **Create account?** — checkbox; reveals password field when ticked. Account creation failures are silently ignored (must not block order).
7. **Place Order** — primary button, disabled while submitting.

### Validation

- Inline, on blur (not on every keystroke).
- Required fields show error text below the input.
- Submit disabled until required fields are filled.
- On submit error from Medusa: banner at top of form, scroll to it, keep form state intact.

### Styling

Reuse existing tokens: `coral-500` primary, `blush-400` borders, `font-display` headings, `font-sans` body. Inputs match the visual pattern in `ProductBuy.tsx`.

## Success page (`/checkout/success?order=<id>`)

- Reads `order` query param → `clientSdk.store.order.retrieve(id)`.
- Missing or invalid → redirect to `/`.
- Renders:
  - Heading: "Thank you, [first name]!" + order number
  - Note: "We'll call you on [phone] to confirm delivery — typically within 1–2 business days."
  - Order summary: items (thumbnail, title, variant, qty, line total), subtotal, shipping, total
  - Shipping address recap
  - CTAs: "Continue Shopping" → `/shop`, "Back to Home" → `/`
- Same coral/blush/cream styling.

## Edge cases & errors

| Case | Behavior |
|---|---|
| Cart empty when landing on `/checkout` | Empty state: "Your bag is empty" + "Continue Shopping" CTA. No redirect. |
| Cart already completed (back button after success) | Same empty state. `cart.completed_at` triggers `clearStoredCartId`. |
| Variant went out of stock between add-to-cart and place-order | Medusa error → banner: "Some items are no longer available. [Review bag]" opens drawer. |
| `cart.complete` network failure | Banner: "Couldn't place your order. Please try again." Form stays filled, button re-enabled. |
| Invalid `order` id on success page | Redirect to `/`. |
| User taps Place Order twice | Button disabled while in-flight + loading spinner. |
| Optional account creation fails | Order still completes. Silent log, no user-facing error. |

## Deferred (revisit after this ships)

The following were explicitly out of scope for this iteration. Each is independent and can be tackled as its own slice:

- **Discount / promo codes** — Medusa supports them; needs UI (input + apply button) and a `cart.update` call. Logical next add.
- **Saved addresses / customer profile** — depends on having logged-in customers (`/account`). Pairs naturally with the customer accounts slice.
- **Order lookup / order history** — `/account/orders` and `/order/<id>` pages so customers can revisit orders. Needs auth.
- **Email order confirmations** — lives on the Medusa backend (notification provider, e.g. Resend/SendGrid). Not a frontend change.
- **Address autocomplete (Google Places or similar)** — UX polish, not required for launch.
- **International / multi-region shipping** — currently MU-only; would expand the country dropdown and require Medusa region/zone setup.

## Acceptance criteria

- A guest can land on `/checkout` from the cart drawer, fill the form, place a COD order, and land on `/checkout/success` showing their order number and summary.
- A real Medusa order is created (confirmable in the admin) with correct items, shipping address, shipping method, and `cod` payment session.
- Empty cart on `/checkout` shows an empty state, not an error.
- "Create account" checkbox produces a Medusa customer when ticked; absence does not block the order.
- Free shipping kicks in correctly at Rs.999 (matches the cart drawer's promise).
- All validation, edge cases, and error states behave as described above.
