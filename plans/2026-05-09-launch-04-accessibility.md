# Plan 04 — Accessibility fixes

**Owner:** Frontend
**Priority:** P1 — keyboard + screen-reader users currently locked out of key flows
**Estimated effort:** 3–5 hours
**Repo:** `DUB-front`

## Context
Three blocking patterns: hover-only desktop submenus (keyboard can't reach), unassociated form errors (screen readers silent), and missing live regions for status changes.

## Tasks

### Step 1 — Fix keyboard navigation on desktop submenus
- File: `DUB-front/src/components/Header.tsx:189-225` (NavItem component)
- Currently: `onMouseEnter`/`onMouseLeave` only.
- Add:
  - `onFocus` (open) and `onBlur` (close, with a small delay to allow Tab between trigger and submenu)
  - `onKeyDown`: Escape closes, Arrow Down moves focus into submenu
  - `aria-haspopup="true"` on trigger
  - `aria-expanded={open}` on trigger
- The trigger should be a `<button>` not a styled `<a>` (it has no destination).

### Step 2 — Associate inline errors with inputs in `CheckoutForm`
- File: `DUB-front/src/app/checkout/CheckoutForm.tsx:63-79` (Field component)
- For every field with an error:
  - Give the error span a stable `id` (e.g. `${name}-error`)
  - Add `aria-describedby={errorId}` and `aria-invalid={!!error}` on the `<input>`
  - When error clears, drop both attrs
- Same pattern for `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `TrackOrderForm`.

### Step 3 — Add `role="alert"` to error banners
- Files:
  - `DUB-front/src/app/login/LoginForm.tsx:50-54`
  - `DUB-front/src/app/register/RegisterForm.tsx` (verify, likely same pattern)
  - `DUB-front/src/app/forgot-password/ForgotPasswordForm.tsx`
  - `DUB-front/src/app/reset-password/ResetPasswordForm.tsx`
  - `DUB-front/src/app/checkout/CheckoutForm.tsx` top-of-form banner
- Add `role="alert"` (or `aria-live="assertive"`) so failed submissions are announced.

### Step 4 — Color swatches as radiogroup
- File: `DUB-front/src/components/product/ProductBuy.tsx:205-218`
- Wrap swatches in `<div role="radiogroup" aria-labelledby="color-label">`
- Each `<button>` becomes `role="radio" aria-checked={selected === v} tabIndex={selected === v ? 0 : -1}`
- Add Arrow Left/Right keyboard navigation between swatches.
- Same pattern for size buttons (line 220-234) — add `aria-pressed` at minimum or convert to radiogroup.

### Step 5 — Fix Quick Add nesting in ProductCard
- File: `DUB-front/src/components/ProductCard.tsx:122-201`
- Currently: `<button>` (Quick Add) and heart `<button>` are nested inside an outer `<Link>` — invalid HTML and breaks keyboard focus.
- Fix: Move buttons OUTSIDE the `<Link>` — wrap them as siblings inside a positioned parent. The Link covers the card image area only.
  ```tsx
  <div className="relative">
    <Link href={...} className="...image area...">...</Link>
    <button ...>Quick Add</button>
    <button aria-label="wishlist">♡</button>
  </div>
  ```

### Step 6 — CartDrawer aria-modal + live region
- File: `DUB-front/src/components/cart/CartDrawer.tsx`
- Add to the `<aside>`: `aria-modal="true"` and `aria-labelledby="cart-drawer-title"` (give the h2 that id).
- Add a polite live region inside the drawer that announces "Item added", "Item removed", "Quantity updated".
- After remove, move focus to the next remove button or close button (currently focus drops).

### Step 7 — Lightbox focus trap
- File: `DUB-front/src/components/product/Lightbox.tsx`
- Currently no focus trap — Tab escapes to underlying page.
- Wrap content in `<FocusTrapLayer>` (same pattern as `CartDrawer`).
- Verify Escape closes (already implemented).
- Add `aria-labelledby` pointing to the image alt or product title.

### Step 8 — Footer semantic structure
- File: `DUB-front/src/components/Footer.tsx`
- Convert column titles (currently styled `<div>`s) to `<h3>` for proper landmark hierarchy.
- Wrap each link column in `<nav aria-label="Shop">`, `<nav aria-label="Help">`, etc.

### Step 9 — Stock status announcements
- File: `DUB-front/src/components/product/ProductBuy.tsx:103-105`
- Wrap `●` / `⚠` glyphs in `<span aria-hidden="true">` so screen readers don't read "BLACK CIRCLE".
- Add `aria-live="polite"` on the stock paragraph so "Sold out" toggle is announced.

### Step 10 — Reduced-motion respect for typewriter
- File: `DUB-front/src/components/Header.tsx` (search placeholder hook `useAnimatedHint`)
- Hook does not honor `prefers-reduced-motion`. Add a check inside the hook:
  ```tsx
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return placeholders[0]; // static
  }
  ```

## Verification checklist
- [ ] Keyboard-only navigation: Tab through home → can reach every submenu link
- [ ] NVDA / VoiceOver announces every form error inline + the top banner
- [ ] Cart drawer: focus stays trapped, "Item added" announced, Escape closes
- [ ] PDP color swatches: arrow keys move between swatches, current is announced
- [ ] No interactive-in-interactive HTML in ProductCard (run html-validate or browser inspector)
- [ ] Lighthouse accessibility score ≥ 95 on home, shop, PDP, checkout
- [ ] Production build clean

## Out of scope
- Color contrast ratio re-audit across full design system (Plan 04b future)
- Touch target audit beyond critical paths (Plan 04b future)
