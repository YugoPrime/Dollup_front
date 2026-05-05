# Phase 8 — `dollup-admin` Next.js Container Migration

**Date:** 2026-05-05 (planning)
**Lane:** New repo
**Priority:** Post-launch
**Estimate:** ~2–3 days
**Depends on:** Storefront live and stable, Phase 6.5 + Phase 6 shipped
**Blocks:** Phase 9 (AI oversight UI)

## Goal
Extract custom admin from storefront into standalone `dollup-admin/` Next.js 16 app deployed at `admin.dollupboutique.com`. Reduces storefront bundle, improves security separation, gives one home for settings + AI oversight.

## Why
- `/admin/orders` and `/admin/prep` ship admin-only React in customer bundles
- No clean home for settings (Loyalty, Email toggles, Shipping rates, Store info)
- Future-proofs for AI agent oversight UI (Phase 9)
- Medusa admin keeps catalog. dollup-admin owns DM ops + config + AI oversight.

## Scope
1. New repo: `github.com/YugoPrime/dollup-admin`
2. Stack: Next.js 16 App Router + Tailwind v4 (mirror storefront)
3. **Migrate from DUB-front:**
   - `src/app/admin/orders/*` → `dollup-admin/app/orders/*`
   - `src/app/admin/prep/*` → `dollup-admin/app/prep/*`
   - HMAC session middleware (`proxy.ts` per Next.js 16 rename)
   - Admin layout, sidebar, login screen
4. **New routes:**
   - `/settings/loyalty` — 5 knobs (earn rate, redeem rate, min redeem, welcome bonus, expiry)
   - `/settings/email` — 5 per-event toggles, from-address read-only
   - `/settings/shipping` — free threshold, home/post/express fees, Rodrigues, pre-order ETA, return fee
   - `/settings/store` — phone, email, hours, social URLs, footer copyright
5. **Storefront refactor:** `/shipping`, `/returns`, `/contact` pages fetch settings from new Medusa custom routes (no more hardcoded constants)
6. **Backend:** new `/admin/settings/*` routes that read/write the settings table (already started in Phase 6.5)
7. **Coolify deploy** at `admin.dollupboutique.com`
8. **Auth:** keep HMAC cookie pattern; cookie domain `.dollupboutique.com` so it works across subdomains

## Steps (high-level — expand on kickoff)
1. Scaffold dollup-admin with Next.js 16 + Tailwind v4 + Tailwind theme tokens (copy from storefront)
2. Port HMAC `proxy.ts` middleware
3. Port `/admin/orders` feature-by-feature, smoke test each
4. Port `/admin/prep`
5. Build `/settings/loyalty` — read/write via new backend routes
6. Build `/settings/email` — 5 toggles
7. Build `/settings/shipping` — refactor backend to expose settings; refactor storefront `/shipping` page to consume
8. Build `/settings/store` — refactor `nav.ts` SOCIAL_LINKS + Footer phone/email reads
9. Coolify setup + DNS A record for `admin.`
10. Smoke test on staging
11. Cut over: delete `src/app/admin/*` from DUB-front, redeploy storefront

## Acceptance
- `admin.dollupboutique.com` serves admin UI with HMAC auth
- `shop.dollupboutique.com` storefront bundle no longer ships admin code
- All settings live in `dollup-admin/settings/*` and persist to DB
- `/shipping`, `/returns`, `/contact` public pages read settings dynamically
- Both apps deploy independently from their own repos

## Out of scope (this phase)
- AI oversight UI — Phase 9
- Replacing Medusa admin (Medusa keeps catalog ownership forever)

## Handoff notes
- Medusa admin stays put — handles products, prices, promotions, customers, regions, sales channels
- dollup-admin handles DM-specific ops + settings + AI oversight
- Cookie domain `.dollupboutique.com` lets HMAC session work across `shop.` and `admin.` (if needed)
- Reference workspace `CLAUDE.md` and `dollup-strategic-direction.md` memory
