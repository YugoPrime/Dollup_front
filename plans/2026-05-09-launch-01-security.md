# Plan 01 — Security hardening (LAUNCH-CRITICAL)

**Owner:** Backend + frontend pair
**Priority:** P0 — must clear before going live on dollupboutique.com
**Estimated effort:** 3–4 hours
**Repos touched:** `dollup-medusa` (backend), `DUB-front` (frontend)

## Context
Two security issues must clear before public launch:
1. The storefront authenticates with **full Medusa admin credentials** to fetch shipping rates (`src/lib/medusa-admin.ts`). Privilege overreach. Any leak (logs, SSRF, error responses) gives an attacker full admin access to Medusa.
2. `.env.local` contains live credentials in plaintext — `MEDUSA_ADMIN_PASSWORD=DollUp2026!` plus dead `ADMIN_PASSWORD=Put@in974M` and `ADMIN_SESSION_SECRET=…` from the deleted `/admin` tree.

## Tasks

### Step 1 — Rotate Medusa admin password (DO FIRST, BEFORE ANY CODE CHANGES)
- Log into Medusa admin (`api.dollupboutique.com/app`) with current creds.
- Settings → Users → change password to a fresh value (1Password / Bitwarden generator, 32 chars).
- Update Coolify env: `MEDUSA_ADMIN_PASSWORD` on the Medusa container.
- **Do not** update `DUB-front`'s env yet — we're removing this dependency entirely.

### Step 2 — Add public store-config endpoint to Medusa backend
- File: `Backend/dollup-medusa/src/api/store/store-config/route.ts` (create)
- Use the existing publishable API key auth (Medusa middleware does this automatically for `/store/*` routes).
- Return: `{ shipping: { free_shipping_threshold_mur, options: [{ id, name, amount, description }] } }`
- Pull data via `container.resolve(ModuleRegistrationName.FULFILLMENT)` — list shipping options for the MU region.
- Cache for 5 min via `Cache-Control: public, max-age=300`.
- Reference: `Backend/dollup-medusa/src/api/store/*` for existing public route patterns.

### Step 3 — Replace `medusa-admin.ts` with public SDK call
- File: `DUB-front/src/lib/store-config.ts` (likely already exists — extend, don't replace)
- Switch fetch source from `medusa-admin.ts` → new `/store/store-config` endpoint via the public SDK (`sdk.client.fetch` with the publishable key).
- Delete `DUB-front/src/lib/medusa-admin.ts` entirely.
- Grep for any remaining imports: `Grep "medusa-admin" DUB-front/src/`.

### Step 4 — Clean env vars
- Remove from `DUB-front/.env.local`:
  - `MEDUSA_ADMIN_EMAIL`
  - `MEDUSA_ADMIN_PASSWORD`
  - `ADMIN_PASSWORD` (dead — `/admin` tree was deleted on 2026-05-06)
  - `ADMIN_SESSION_SECRET` (dead)
- Remove same vars from Coolify (frontend container only — keep the rotated `MEDUSA_ADMIN_PASSWORD` on the backend container).
- Update `.env.example` to mirror the new shape.

### Step 5 — Move customer JWT from localStorage to httpOnly cookie
- Files: `DUB-front/src/lib/cart-client.ts:13`, `DUB-front/src/lib/auth-client.ts:47`
- Current: `localStorage.setItem("medusa_auth_token", token)` — vulnerable to any XSS.
- Replace with cookie set via Medusa SDK's session option, or a dedicated `/api/auth/session` Next.js route handler that sets `Set-Cookie: token; HttpOnly; Secure; SameSite=Lax; Path=/`.
- All reads of `localStorage.getItem("medusa_auth_token")` must be replaced with cookie reads on the server / SDK auto-attach on client.
- Note: this is a **larger change** — if 36h is too tight, defer to post-launch (P1) but document the XSS risk explicitly.

### Step 6 — Promote CSP to enforcing mode
- File: `DUB-front/next.config.ts:49`
- Currently `Content-Security-Policy-Report-Only` with `report-uri /api/csp-report` pointing to a 404.
- Tighten policy:
  - `script-src 'self' 'unsafe-inline'` (remove wildcard `https:` and `'unsafe-eval'` — verify nothing breaks; if Stripe/embeds fail, allowlist explicitly).
  - `connect-src 'self' https://api.dollupboutique.com https://cdn.dollupboutique.com`
  - `img-src 'self' https://cdn.dollupboutique.com https://medusa-public-images.s3.eu-west-1.amazonaws.com data: blob:`
- Either implement `DUB-front/src/app/api/csp-report/route.ts` (logs POST body) or remove the `report-uri` directive.
- After 24–48h of `Report-Only` with no violations, rename header to `Content-Security-Policy` (enforcing).

### Step 7 — Validate Google OAuth redirect host
- File: `DUB-front/src/lib/auth-client.ts:130`
- Before `window.location.href = result.location`, check `new URL(result.location).hostname === "accounts.google.com"`. Throw if not.

### Step 8 — Add Permissions-Policy denials
- File: `DUB-front/next.config.ts:46`
- Extend value to: `camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()`

## Verification checklist
- [ ] `grep -ri "medusa-admin" DUB-front/src/` returns no matches
- [ ] `grep -ri "MEDUSA_ADMIN_" DUB-front/` returns only `.env.example` (with placeholder)
- [ ] PDP loads and shipping cost displays correctly via the new endpoint
- [ ] Checkout completes end-to-end with COD
- [ ] Login → cookie set, no token in localStorage devtools
- [ ] CSP header present, no console violations on home/shop/PDP/checkout
- [ ] Production build clean: `npm run build`
- [ ] Old admin password marked retired in password manager

## Out of scope (future plans)
- Customer JWT cookie migration may move to its own plan if Step 5 can't fit in 36h
- Backend rate-limiter Redis migration (currently in-memory) — Plan 03 mentions
