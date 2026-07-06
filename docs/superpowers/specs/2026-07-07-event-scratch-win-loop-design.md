# Doll Up "Scratch & Win" — unified code → review → spin → draw loop

**Date:** 2026-07-07
**Status:** Design — awaiting implementation plan
**Scope:** Cross-repo — `DUB-front` (storefront UX), `Backend/dollup-medusa` (custom module), `dollup-admin` (ops UI)

---

## 1. Purpose

Every Doll Up bag ships with a thank-you card carrying a QR code → `dollupboutique.com/event`.
Today that page (`/events`) only shows the Mystery Box. We are replacing the ad-hoc giveaway
with **one unified loop** that does three jobs at once:

1. **Collect reviews** (on-site, plus funnel to Google & Instagram)
2. **Capture contact data** (email + WhatsApp/phone) for remarketing
3. **Delight & retain** via a gamified spin (reuses the Mystery Box wheel aesthetic)

Success = high card-scan → completion rate, a growing email/WhatsApp list, and a steady flow
of on-site reviews, without junk 5-star reviews or Google-policy exposure.

---

## 2. The customer loop (on `/event`)

1. **Enter code** — unique pre-printed code from the card (e.g. `DUB-7K3P`). Validated
   server-side: must exist and be unredeemed. Invalid / already-used → friendly inline error.
2. **Give contact** — email **and** WhatsApp/phone, both required. *This is the data capture.*
   Consent checkbox for marketing messages.
3. **Base reward: 1 spin.** Two "earn more spins" cards shown:
   - ✍️ **Leave a review on your last order → +1 spin** (on-site review, tied to the customer's
     most recent order)
   - 📸 **Tag @dollupboutique on IG _or_ ⭐ review us on Google → +1 spin** (self-attested).
     Google is an **optional link-out button**, never a gated requirement.
4. **Spin the wheel** — reuses the `SpinWheel` component / visual language from
   `src/app/events/mystery-box/SpinWheel.tsx`.
5. **Instant prize** shown on-screen + sent to email/WhatsApp. Grand-prize slices instead show
   *"You're in the July draw 🎉"*.

Bonus spins are capped at **+2** total (max 3 spins per code).

---

## 3. Reward model — Phase 1 (points-only)

Redemption reuses the **existing Doll Rewards loyalty system** (`applyLoyaltyRedemption`,
`LoyaltyRedeemBox`) — no new promotions engine in Phase 1. Consequence: wheel prizes are
**points-denominated**, because % off / free shipping / fixed Rs vouchers require a checkout
reward-code field that is deferred to Phase 2.

**Wheel slices (Phase 1), weights tunable in admin:**

| Slice | Reward | Notes |
|---|---|---|
| Small win | +50 Doll Rewards pts | most common slice |
| Medium win | +100 pts | |
| Large win | +200 pts | rarer |
| Grand-prize entry | Monthly draw entry | the aspirational slice |
| (optional) Surprise gift | "free gift with next order" | fulfilled manually, flagged on the order |

Instant point wins are credited to the customer's Doll Rewards account (requires the contact
email to match / create a loyalty account). Points are already redeemable at checkout today.

**Phase 2 upgrade (see §8):** add a "Have a reward code?" field at checkout mirroring
`applyLoyaltyRedemption`, unlocking **% off / free shipping / fixed Rs voucher** slices with
single-use, expiry-dated, min-spend-guarded codes.

---

## 4. Reviews

- **On-site review** is the rewarded action — Doll Up owns it, safe to incentivize. Ties to the
  customer's most recent order. (On-site review capability is a dependency — see §9.)
- **Google Business Profile** — optional link-out for "extra love." **Never gated behind the
  reward** (Google bans incentivized reviews; gating risks review removal / profile flag).
- **Instagram** — self-attested `@dollupboutique` tag earns the shared bonus spin; verified
  loosely by hand when picking monthly winners.

---

## 5. Backend — `event-draw` custom Medusa module

Server-authoritative, same pattern as the existing loyalty module. Tables/models:

- **`codes`** — `code`, `batch_id`, `created_at`, `redeemed_at` (single-use).
- **`entries`** — `code`, `email`, `phone`, `spins_earned`, `spins_used`, `ip`, `device_hint`,
  `created_at`. One entry per code.
- **`rewards`** — issued instant rewards: `entry_id`, `type` (`points` | future `code`), `value`,
  `status`.
- **`draw_entries`** — `entry_id`, `draw_period` (e.g. `2026-07`), for the monthly grand prize.

Endpoints (store-facing, rate-limited): validate code, submit contact, claim bonus spin,
execute spin (server decides the slice — never trust the client), issue reward.

Winner selection is **not** automated in Phase 1 — done from admin.

---

## 6. Admin UI (in `dollup-admin`)

New "Events / Draw" section (ops hub — not a Medusa `/app` extension, per project convention):

- **Generate code batch** → N unique codes → export CSV/PDF for printing.
- **Entries dashboard** — scans, completions, spins, reviews earned, conversion.
- **Monthly draw** — list `draw_entries` for the period, pick winner, mark announced.
- **Wheel config** — slice weights + reward values (so odds are tunable without a deploy).

---

## 7. Monthly grand draw

- Runs monthly; entries accumulate from "grand-prize" wheel slices during the period.
- Winner picked in admin, notified by email/WhatsApp, announced on `/event` + IG story.
- Prize varies month to month (e.g. Rs 2,000 voucher / free Mystery Box / a featured outfit) —
  set per period in admin.

---

## 8. Phasing

**Phase 1 (core loop):**
1. `/event → /events` permanent redirect (existing printed cards must keep working).
2. `event-draw` Medusa module (codes, entries, rewards, draw_entries) + store endpoints.
3. Admin: batch generation + entries dashboard + monthly draw picker + wheel config.
4. `/event` UX: code entry → contact capture → earn-spins → wheel → points reward.
5. Points credited via existing loyalty system. Grand prize handled manually.
6. Google/IG as link-outs.

**Phase 2 (later):**
- Checkout **"Have a reward code?"** field (mirrors `applyLoyaltyRedemption`) → unlocks
  % off / free shipping / fixed Rs voucher slices.
- December **advent-calendar** skin (24 daily doors) layered on the same engine.
- **Photo reviews** as UGC for Meta ads.
- Automated winner notification.

---

## 9. Dependencies & risks

- **On-site reviews** — the rewarded action needs a working "leave a review on your order"
  capability tied to an order. Confirm whether product/order reviews already exist in the
  storefront; if not, a minimal review capture is part of Phase 1 scope.
- **Loyalty account linkage** — crediting points requires matching/creating a Doll Rewards
  account from the entry email. Confirm the loyalty module supports point credit by email.
- **Google policy** — incentivized Google reviews are prohibited; keep Google strictly a
  non-gated link-out.
- **Anti-abuse** — unique single-use code + required contact + soft IP/device rate-limit +
  bonus-spin cap (+2). Server decides the wheel result; the client never picks the prize.
- **Route mismatch** — cards point to `/event`; page is `/events`. Redirect is a hard Phase-1
  blocker or scanned cards 404.

---

## 10. Data captured (for remarketing)

Per entry: email, WhatsApp/phone, marketing consent, source code/batch, review status,
IG/Google engagement flags, spin outcome, draw participation. Feeds email flows + WhatsApp
broadcasts.
