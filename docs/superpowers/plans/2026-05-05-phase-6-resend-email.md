# Phase 6 — Resend Transactional Email

**Date:** 2026-05-05
**Lane:** Backend (`Backend/dollup-medusa/`)
**Priority:** P1
**Estimate:** ~3 hrs (after user provides Resend API key + DNS)
**Depends on:** Resend account + `dollupboutique.com` already verified on Resend (DNS via Cloudflare). User just needs to drop the `RESEND_API_KEY` into Coolify backend env. Phase 6.5 should ship first (settings infrastructure).
**Blocks:** Customer order confirmations are silent until this ships
**Parallel-safe with:** Phase 4.7, Phase 5 (different repo). Sequential after Phase 6.5 in backend lane.

## Goal
Send transactional emails via Resend on key commerce events: order placed, shipped, delivered, password reset, welcome.

## Files this phase OWNS
- `src/modules/notification-resend/` (NEW directory)
  - `index.ts`
  - `service.ts`
- `src/emails/` (NEW directory — React Email templates)
  - `order-placed.tsx`
  - `order-shipped.tsx`
  - `order-delivered.tsx`
  - `password-reset.tsx`
  - `welcome.tsx`
  - `_layout.tsx` (shared header/footer)
- `medusa-config.ts` (EDIT — register notification module)
- `src/subscribers/email-on-order-placed.ts` (NEW)
- `src/subscribers/email-on-order-shipped.ts` (NEW)
- `src/subscribers/email-on-order-delivered.ts` (NEW)
- `src/subscribers/email-on-customer-created.ts` (NEW — welcome)
- `src/subscribers/email-on-password-reset.ts` (NEW)
- `src/admin/widgets/email-toggles.tsx` (NEW — per-event ON/OFF)

## Steps
1. **User pre-work — DONE:** Resend account live, `dollupboutique.com` verified on Resend (DNS via Cloudflare). User to provide API key for Coolify env var.
2. `npx ctx7@latest library "Medusa" "v2 notification module custom Resend"`
3. `npx ctx7@latest library "React Email" "Resend Next.js integration"`
4. `yarn add resend @react-email/components @react-email/render`
5. Build `notification-resend` module implementing `INotificationModuleService.send()`:
   - Renders React Email template via `@react-email/render`
   - Calls `resend.emails.send({ from, to, subject, html })`
   - Returns `id` from Resend
6. Build 5 templates with brand colors (coral `#E5604A`, cream, blush). Shared `_layout.tsx` with logo + footer. Render data: customer name, order id, line items, total, tracking url, etc.
7. Register module in `medusa-config.ts`
8. Coolify env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL=hello@dollupboutique.com`, `RESEND_FROM_NAME="Doll Up Boutique"`
9. Subscribers fire `notification.send` on `order.placed`, `order.shipped`, `order.delivered`, `customer.created`, `customer.password_reset_requested`
10. Add admin widget: 5 toggles (one per event), reads/writes from existing settings infra (Phase 6.5 settings table — extend with `email_*_enabled` booleans, default true)
11. Test: place test order → email arrives within 30s → CTAs link to live site → renders cleanly in Gmail + Outlook + Apple Mail (use Resend preview)
12. `yarn typecheck && yarn build` clean

## Acceptance
- Order confirmation email lands within 30s of placement
- Shipped email fires when admin marks `dm_status=shipped` in prep page
- Welcome email fires on customer registration
- Password reset email fires on `/forgot-password` submit
- Admin widget toggles each event ON/OFF
- Templates render without broken layout in 3 major email clients
- All emails branded — no plain text fallback shown to user

## Out of scope
- Marketing emails / newsletter blasts (separate ESP later)
- SMS notifications
- WhatsApp notifications
- Per-customer email preferences UI

## Handoff notes
- From address MUST match verified Resend domain
- Resend sandbox until DNS verified — won't reach external inboxes
- Frontend already has `/forgot-password` and `/reset-password` (auth Phase 2)
- Use Phase 6.5's settings table — extend, don't duplicate
- Test in Resend dashboard "preview" before going live
