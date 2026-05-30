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

## ALL CODE TASKS DONE (2026-05-30) — awaiting owner review + merge

| Task | What | Repo @ commit |
|---|---|---|
| 12 | Deposit cleanup cron (1h reminder + 24h auto-cancel) | medusa @ 723f2c8, fix 466ff6e (order_id) |
| 13 | Admin API: GET list + POST mark-paid | medusa @ 393335f |
| 14 | dollup-admin /preorder/orders view (Products\|Orders sub-nav, status-grouped) | admin @ e7e72ba |

cancelOrderWorkflow confirmed in 2.13.1; input is `{ order_id, no_notification }`.
No sage tokens in dollup-admin — used existing coral/blush/success/amber/zinc.
All 3 repos tsc-clean (backend's only errors are pre-existing chat/stories test
specs + diag-cutout-coverage.ts — none from this work).

## REMAINING (owner-driven decisions, 2026-05-30)

- **Owner will review + merge** each repo's `feat/preorder-checkout` → master
  manually (each merge auto-deploys via Coolify). Nothing is live until then.
- **Coolify env**: confirm `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_PREORDER` is set on
  the DUB-front service (likely already is — preorder host serves products today).
- **Live smoke after deploy** (the tracer-bullet path): preorder host → add product
  → drawer "Proceed to Checkout" → lands on /preorder/checkout (NOT 404) → fill form
  → place → success page shows deposit + Juice details → Medusa admin order has
  preorder_status=awaiting_deposit + correct deposit/balance/total + ~24h deadline →
  customer deposit email + owner copy + Telegram "NEW PRE-ORDER" → dollup-admin
  /preorder/orders shows it under Awaiting → "Mark deposit received" → moves to
  Deposit paid + customer confirmed email. Then verify apex /checkout still works
  unchanged (in-stock COD).
- **2 unrelated commits** ride the branches (decided: leave them) — backend 03d3e49
  (story spec), admin 6a04765 (sourcing revert). Merge delivers them too.
- **Task 9 (SKIPPED by decision)** — apex CheckoutForm still uses its own inline
  fields; CheckoutFields is only consumed by the preorder form. Revisit if they drift.
- **Deferred follow-up (NOT started)**: capture SHEIN per-variant SKU at import →
  store as Medusa variant.sku so it flows onto preorder order lines + admin view.

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
