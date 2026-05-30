# Pre-Order Checkout — Execution Progress

**As of:** 2026-05-30 (session limit hit mid-Task-12)
**Plan:** `docs/superpowers/plans/2026-05-29-preorder-checkout-deposit.md`
**Spec:** `docs/superpowers/specs/2026-05-29-preorder-checkout-deposit-design.md`
**Branch (all 3 repos):** `feat/preorder-checkout` (NOT merged to master; master auto-deploys to prod)

## DONE (committed on feat/preorder-checkout)

| Task | What | Repo @ commit |
|---|---|---|
| Phase 0 | Shipping price fix (150/70/100) applied LIVE via admin API + reference script | medusa @ 43cd704 (script); live data already corrected |
| 1 | Frontend deposit math `src/lib/preorder-checkout.ts` | DUB-front @ 1363935 |
| 2 | Backend deposit math `src/lib/preorder-deposit.ts` + jest | medusa @ 5ba56a6 |
| 3 | `CheckoutFields.tsx` extracted (apex untouched) | DUB-front @ 8160954 |
| 4+5 | `/preorder/checkout` page + form + `PreorderOrderSummary` | DUB-front @ 2562a78 |
| 6 | `preorder-stamp-on-order-placed.ts` (stamps deposit metadata) | medusa @ c7cd13f |
| 7 | Cart drawer link by cart type (closes the 404) | DUB-front @ 52ecefd |
| 8 | `/preorder/checkout/success` page | DUB-front @ (after 2562a78) |
| 10 | 3 email templates + register + fork order-placed + send from stamp | medusa @ fb2144b |
| 11 | Telegram fork for preorder | medusa @ c7705a6 |

Both repos build clean (DUB-front `npm run build` OK with the preorder key now in
`.env.local`; backend tsc has only PRE-EXISTING errors in diag-cutout-coverage.ts
+ chat/stories test specs — none from our code).

## NOT DONE (resume here)

- **Task 12 — deposit cleanup cron** `src/jobs/preorder-deposit-cleanup.ts` (medusa).
  Was dispatched but the subagent was cut off by the session limit BEFORE writing
  anything — file does not exist, no partial state. Full instructions are in the
  plan (Task 12). KEY: confirm `cancelOrderWorkflow` export name in 2.13.1 before
  using; if unconfirmed, fall back to expire-only (set preorder_status="expired",
  no hard cancel) and note it. Use `query.graph` pagination exactly like
  `src/jobs/preorder-availability-check.ts`. Idempotent via `reminder_sent` +
  status guards.
- **Task 13 — admin API** `src/api/admin/preorder-orders/route.ts` (GET list) +
  `[id]/mark-paid/route.ts` (POST → set deposit_paid + send PREORDER_DEPOSIT_CONFIRMED
  email). medusa. Plan Task 13 has full code.
- **Task 14 — admin orders view (SUBAGENT)** dollup-admin `/preorder/orders` with
  Products|Orders sub-nav, status-grouped, sage-tinted. Plan Task 14 has full spec.
  Depends on Task 13 API.
- **Task 9 (optional, deferred)** — refactor apex CheckoutForm to use CheckoutFields.
- **Deploy + live smoke** — merge branches to master (triggers Coolify deploy),
  then run the tracer-bullet smoke: preorder host → add product → drawer →
  /preorder/checkout (not 404) → place → success page → admin order has
  preorder_status=awaiting_deposit + correct deposit → email + Telegram → mark-paid
  in admin → confirmed email. Coolify must have NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER
  (likely already does, since preorder.dollupboutique.com serves products).

## Key facts learned this session
- MUR = WHOLE RUPEES (real prices 800/1100/890; formatPrice no /100). Deposit math uses raw units.
- Preorder publishable key ("Preorder Storefront", Pre-Order channel):
  `pk_2f80620b1291d7db77ad8fab240292870bded386db4f7556f41153113553d64a` — added to
  DUB-front `.env.local` (gitignored).
- Local env has NO prod DB connection — `yarn medusa exec` can't reach it. Use the
  admin REST API (api.dollupboutique.com + MEDUSA_ADMIN_EMAIL/PASSWORD in
  dollup-admin/.env.local) for live data ops.
- Order metadata update: `orderModule.updateOrders(orderId, { metadata })` (proven).
- Pre-Order shipping options (corrected): Home so_01KSMQMT8FJVNVK640TGJ8NYSB=150,
  Postage so_01KSMQMT8F1RV9BRHB05PTVFSG=70, Rodrigues so_01KSMQMT8GARBFM0M9BVK4ZSY0=100,
  Pickup so_01KSMQMT8GWFT059W3W395AQCV=0.
- Deferred follow-up feature (NOT started): capture SHEIN per-variant SKU at import →
  store as Medusa variant.sku so it flows onto preorder order lines + admin orders view.

## Branch hygiene reminder
Subagents have twice ended up on master. Before each subagent commit, verify
`git branch --show-current` == feat/preorder-checkout. master must stay clean until
you review + merge.
