# Doll Rewards — Frontend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Medusa loyalty backend (`/store/loyalty/*`) into the storefront so logged-in customers see a real points balance, see their transaction history, and can redeem points at checkout for an MUR discount.

**Architecture:** Pure frontend wiring. Backend is already built (`Backend/dollup-medusa/src/modules/loyalty/`, `src/api/store/loyalty/*`, `src/workflows/apply-loyalty-discount.ts`). Add a thin client wrapper, surface the data on `/account` + `/loyalty`, and add a redemption widget to `/checkout` that calls `redeem-preview` (read-only) + `redeem-apply` (mutates cart). No new state container — reuse `useCustomer()` from `auth-client.ts` and `clientSdk.client.fetch` from `cart-client.ts`.

**Tech Stack:** Next.js 16 App Router (RSC + client components), React 19, TypeScript 5, Tailwind v4, `@medusajs/js-sdk@2.14.1`. No test runner — verification is `npx tsc --noEmit`, `npm run build`, manual browser smoke (per `CLAUDE.md`).

**Verification approach:** This codebase has no test runner. Each task ends with `tsc --noEmit` + a manual verification step. The "write failing test first" pattern from generic templates does not apply here.

**Pre-flight (do once before Task 1):**
- Read this file end-to-end before starting.
- Read `Backend/dollup-medusa/src/api/store/loyalty/me/route.ts`, `redeem-preview/route.ts`, `redeem-apply/route.ts`, `transactions/route.ts` — these are the contracts you're consuming.
- Confirm a logged-in customer in dev: `npm run dev`, register at `/register`, then hit `https://api.dollupboutique.com/store/loyalty/me` from the browser DevTools console with `fetch("/store/loyalty/me", { headers: { authorization: "Bearer " + localStorage.getItem("medusa_auth_token"), "x-publishable-api-key": "<key>" } })` (the SDK does this for you, but it's good to see the raw shape).
- Backend must be running and reachable at `NEXT_PUBLIC_MEDUSA_BACKEND_URL`. If `STORE_CORS` doesn't include `http://localhost:3000`, the redeem-preview/apply calls will fail with the recurring "Failed to fetch" CORS bug — see `CLAUDE.md` "CORS gotcha".
- Have at least one test customer with non-zero `points_balance`. Adjust via Medusa admin: `POST /admin/loyalty/accounts/<customerId>/adjust` with `{ points: 500, reason: "test" }`.

---

## File Map

| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/loyalty-client.ts` | Browser-side wrapper around the 4 Store API loyalty endpoints | **Create** |
| `src/components/account/LoyaltyCard.tsx` | Points-balance card shown on `/account` dashboard | **Create** |
| `src/app/account/AccountClient.tsx` | Inject `<LoyaltyCard />` between Profile and Recent Orders | **Modify** |
| `src/app/account/loyalty/page.tsx` | New `/account/loyalty` route — full transaction history | **Create** |
| `src/app/account/loyalty/LoyaltyHistoryClient.tsx` | Client component rendering paginated transactions | **Create** |
| `src/components/checkout/LoyaltyRedeemBox.tsx` | Slider/input + "Apply" button on checkout, shows pending discount | **Create** |
| `src/app/checkout/CheckoutForm.tsx` | Mount `<LoyaltyRedeemBox />` above the order summary; ensure `cart.metadata.loyalty_redeem` survives `cart.update` | **Modify** |
| `src/app/checkout/OrderSummary.tsx` | Show "Doll Rewards −Rs X" line when `cart.metadata.loyalty_redeem` is present | **Modify** |
| `src/components/home/LoyaltyTeaser.tsx` | When logged in, show real points balance instead of generic perks | **Modify** |
| `src/app/loyalty/LoyaltySignup.tsx` | When logged in, replace email/birthday form with a "You have N points" panel + link to `/account/loyalty` | **Modify** |

---

## Task 1: Build the loyalty client wrapper

**Files:**
- Create: `src/lib/loyalty-client.ts`

This file is the single entry point for every loyalty API call from the browser. Uses `clientSdk.client.fetch()` (already configured with JWT auth + publishable key headers) so we don't re-implement auth.

- [ ] **Step 1: Create the file**

```ts
// src/lib/loyalty-client.ts
"use client";

import { clientSdk } from "@/lib/cart-client";

export type LoyaltyAccount = {
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
};

export type LoyaltyTransaction = {
  id: string;
  type: "earn" | "redeem" | "adjust" | "expire" | string;
  points: number;
  reason: string | null;
  order_id: string | null;
  created_at: string;
};

export type LoyaltyTransactionsPage = {
  transactions: LoyaltyTransaction[];
  count: number;
  limit: number;
  offset: number;
};

export type LoyaltyRedeemPreview = {
  points_balance: number;
  max_redeemable: number;
  requested_points: number;
  discount_mur: number;
  balance_after: number;
  min_redeem_points: number;
  redeem_rate_mur_per_100_pts: number;
};

export type LoyaltyRedeemApplied = {
  cart_id: string;
  points_redeemed: number;
  discount_mur: number;
  balance_after: number;
};

export async function getMyLoyalty(): Promise<LoyaltyAccount | null> {
  try {
    const res = await clientSdk.client.fetch<{ loyalty: LoyaltyAccount }>(
      "/store/loyalty/me",
      { method: "GET" },
    );
    return res.loyalty;
  } catch (err) {
    // Guest = 401, treat as "no account" rather than throwing
    if (err instanceof Error && err.message.includes("401")) return null;
    throw err;
  }
}

export async function listLoyaltyTransactions(
  limit = 50,
  offset = 0,
): Promise<LoyaltyTransactionsPage> {
  return clientSdk.client.fetch<LoyaltyTransactionsPage>(
    `/store/loyalty/transactions?limit=${limit}&offset=${offset}`,
    { method: "GET" },
  );
}

export async function previewLoyaltyRedemption(
  cartId: string,
  points: number,
): Promise<LoyaltyRedeemPreview> {
  const res = await clientSdk.client.fetch<{ loyalty: LoyaltyRedeemPreview }>(
    "/store/loyalty/redeem-preview",
    { method: "POST", body: { cart_id: cartId, points } },
  );
  return res.loyalty;
}

export async function applyLoyaltyRedemption(
  cartId: string,
  points: number,
): Promise<LoyaltyRedeemApplied> {
  const res = await clientSdk.client.fetch<{ loyalty: LoyaltyRedeemApplied }>(
    "/store/loyalty/redeem-apply",
    { method: "POST", body: { cart_id: cartId, points } },
  );
  return res.loyalty;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [ ] **Step 3: Manual smoke (DevTools)**

In `npm run dev`, log in as a test customer, then in browser console:

```js
// Verify the wrapper works end-to-end
const m = await import("/src/lib/loyalty-client.ts"); // or import via a temp page
// Or simpler: visit /account in next step and inspect the network tab.
```

(This step is informational — actual smoke happens after Task 2 mounts the data.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/loyalty-client.ts
git commit -m "feat(loyalty): add browser client wrapper for /store/loyalty/*"
```

---

## Task 2: Show points balance on `/account` dashboard

**Files:**
- Create: `src/components/account/LoyaltyCard.tsx`
- Modify: `src/app/account/AccountClient.tsx` (insert `<LoyaltyCard />` once, near the top)

- [ ] **Step 1: Create LoyaltyCard.tsx**

```tsx
// src/components/account/LoyaltyCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

export function LoyaltyCard() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await getMyLoyalty();
        if (!cancelled) setAccount(a);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-blush-300 bg-white p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-blush-100" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-blush-100" />
      </section>
    );
  }

  if (!account) return null;

  return (
    <section className="rounded-2xl border border-blush-300 bg-gradient-to-br from-[#FCE9E4] to-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
            ★ Doll Rewards
          </p>
          <p className="mt-2 font-display text-[36px] leading-none text-ink">
            {account.points_balance.toLocaleString("en-MU")}
            <span className="ml-2 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              points
            </span>
          </p>
          <p className="mt-2 font-sans text-[12px] text-ink-muted">
            Lifetime earned: {account.lifetime_earned.toLocaleString("en-MU")} ·
            redeemed: {account.lifetime_redeemed.toLocaleString("en-MU")}
          </p>
        </div>
        <Link
          href="/account/loyalty"
          className="shrink-0 rounded-full border border-coral-500 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-500 transition-colors hover:bg-coral-500 hover:text-white"
        >
          History →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it in AccountClient.tsx**

Open `src/app/account/AccountClient.tsx`. Find the JSX root (the wrapper around Profile + Recent Orders + Addresses sections). Add the import and place `<LoyaltyCard />` as the first child of that root container.

```tsx
// At the top of the file, with the other imports:
import { LoyaltyCard } from "@/components/account/LoyaltyCard";

// Inside the JSX, immediately after the page header / above the Profile card:
<LoyaltyCard />
```

- [ ] **Step 3: Type-check + dev**

```bash
npx tsc --noEmit
npm run dev
```

Open `http://localhost:3000/account` while logged in. Expected:
- Loading skeleton briefly
- Then a card showing the customer's `points_balance` (call admin adjust endpoint first if zero)
- "History →" button links to `/account/loyalty` (404 expected for now — built in Task 3)

- [ ] **Step 4: Commit**

```bash
git add src/components/account/LoyaltyCard.tsx src/app/account/AccountClient.tsx
git commit -m "feat(loyalty): show points balance on /account dashboard"
```

---

## Task 3: Build `/account/loyalty` transaction history page

**Files:**
- Create: `src/app/account/loyalty/page.tsx` (server shell, redirects guest)
- Create: `src/app/account/loyalty/LoyaltyHistoryClient.tsx` (client list with pagination)

- [ ] **Step 1: Create the server shell**

```tsx
// src/app/account/loyalty/page.tsx
import type { Metadata } from "next";
import { LoyaltyHistoryClient } from "./LoyaltyHistoryClient";

export const metadata: Metadata = {
  title: "Doll Rewards History",
  description: "Your points earned and redeemed.",
  robots: { index: false, follow: false },
};

export default function LoyaltyHistoryPage() {
  return (
    <div className="bg-cream py-12 md:py-16">
      <div className="mx-auto max-w-[800px] px-6 md:px-10">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          ★ Doll Rewards
        </p>
        <h1 className="font-display text-[32px] leading-tight text-ink md:text-[44px]">
          Your points history
        </h1>
        <p className="mt-2 font-sans text-[14px] text-ink-soft">
          Every earn, redeem and adjustment, newest first.
        </p>

        <div className="mt-8">
          <LoyaltyHistoryClient />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the client list**

```tsx
// src/app/account/loyalty/LoyaltyHistoryClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  listLoyaltyTransactions,
  type LoyaltyTransaction,
} from "@/lib/loyalty-client";

const PAGE_SIZE = 20;

function typeLabel(type: string): { label: string; color: string } {
  switch (type) {
    case "earn":
      return { label: "Earned", color: "text-emerald-600" };
    case "redeem":
      return { label: "Redeemed", color: "text-coral-500" };
    case "adjust":
      return { label: "Adjusted", color: "text-ink-soft" };
    case "expire":
      return { label: "Expired", color: "text-ink-muted" };
    default:
      return { label: type, color: "text-ink-soft" };
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-MU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function LoyaltyHistoryClient() {
  const { status, customer } = useCustomer();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<LoyaltyTransaction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready") return;
    if (!customer) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await listLoyaltyTransactions(PAGE_SIZE, page * PAGE_SIZE);
        if (!cancelled) {
          setItems(res.transactions);
          setCount(res.count);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, customer, page]);

  if (status === "loading") {
    return <div className="h-32 animate-pulse rounded-2xl bg-blush-100" />;
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-blush-300 bg-white p-8 text-center">
        <p className="font-sans text-[14px] text-ink-soft">
          Sign in to see your points history.
        </p>
        <Link
          href="/login?redirect=/account/loyalty"
          className="mt-4 inline-block rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-blush-100" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-blush-300 bg-white p-8 text-center">
        <p className="font-sans text-[14px] text-ink-soft">
          No transactions yet. Place an order to start earning.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          Browse the shop →
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-3">
      {items.map((t) => {
        const { label, color } = typeLabel(t.type);
        const sign = t.points >= 0 ? "+" : "";
        return (
          <div
            key={t.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-blush-300 bg-white p-4"
          >
            <div className="min-w-0">
              <p className={`font-sans text-[11px] font-bold uppercase tracking-[0.14em] ${color}`}>
                {label}
              </p>
              <p className="mt-1 truncate font-sans text-[13px] text-ink">
                {t.reason ?? "—"}
              </p>
              <p className="mt-1 font-sans text-[11px] text-ink-muted">
                {formatDate(t.created_at)}
                {t.order_id ? ` · order ${t.order_id.slice(0, 8)}…` : ""}
              </p>
            </div>
            <p className="shrink-0 font-display text-[20px] text-ink">
              {sign}
              {t.points.toLocaleString("en-MU")}
            </p>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="font-sans text-[12px] text-ink-soft">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + dev**

```bash
npx tsc --noEmit
```

Visit `http://localhost:3000/account/loyalty` while logged in. Expected:
- Page header
- List of transactions newest-first (or empty state)
- Pagination if more than 20

- [ ] **Step 4: Commit**

```bash
git add src/app/account/loyalty/
git commit -m "feat(loyalty): add /account/loyalty history page with pagination"
```

---

## Task 4: Add the redemption widget to checkout

**Files:**
- Create: `src/components/checkout/LoyaltyRedeemBox.tsx`
- Modify: `src/app/checkout/CheckoutForm.tsx` — mount the widget; ensure `cart.update` calls don't wipe `cart.metadata.loyalty_redeem` (the backend stamps it; if you spread metadata, preserve it)
- Modify: `src/app/checkout/OrderSummary.tsx` — read `cart.metadata.loyalty_redeem` and render a "Doll Rewards −Rs X" line above totals

- [ ] **Step 1: Build the widget**

```tsx
// src/components/checkout/LoyaltyRedeemBox.tsx
"use client";

import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import {
  applyLoyaltyRedemption,
  getMyLoyalty,
  previewLoyaltyRedemption,
  type LoyaltyAccount,
  type LoyaltyRedeemPreview,
} from "@/lib/loyalty-client";

type Props = {
  cartId: string;
  /** Called after a successful redeem so the parent can refresh its cart copy. */
  onApplied: () => void;
  /** True if the cart already has a redemption (cart.metadata.loyalty_redeem). */
  alreadyApplied: boolean;
  /** Already-applied points + discount, for display when alreadyApplied. */
  applied?: { points: number; discount_mur: number };
};

export function LoyaltyRedeemBox({ cartId, onApplied, alreadyApplied, applied }: Props) {
  const { status, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [points, setPoints] = useState<string>("");
  const [preview, setPreview] = useState<LoyaltyRedeemPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready" || !customer) return;
    getMyLoyalty().then(setAccount).catch(() => setAccount(null));
  }, [status, customer]);

  // Debounced preview as the user types
  useEffect(() => {
    if (alreadyApplied) return;
    const n = Number.parseInt(points, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const p = await previewLoyaltyRedemption(cartId, n);
        setPreview(p);
      } catch (e) {
        setPreview(null);
        setError(e instanceof Error ? e.message : "Preview failed");
      } finally {
        setPreviewing(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [points, cartId, alreadyApplied]);

  if (status === "loading") return null;
  if (!customer) return null;
  if (!account) return null;

  if (alreadyApplied && applied) {
    return (
      <div className="rounded-2xl border border-coral-500 bg-coral-500/5 p-5">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          ★ Doll Rewards applied
        </p>
        <p className="mt-2 font-display text-[20px] text-ink">
          {applied.points.toLocaleString("en-MU")} points · −Rs {applied.discount_mur.toLocaleString("en-MU")}
        </p>
        <p className="mt-2 font-sans text-[12px] text-ink-muted">
          Remove this redemption by clearing the cart.
        </p>
      </div>
    );
  }

  if (account.points_balance === 0) {
    return null; // no points, hide the widget entirely
  }

  return (
    <div className="rounded-2xl border border-blush-300 bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          ★ Use Doll Rewards
        </p>
        <p className="font-sans text-[12px] text-ink-soft">
          You have <strong className="text-ink">{account.points_balance.toLocaleString("en-MU")}</strong> pts
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={account.points_balance}
          step="100"
          inputMode="numeric"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Points to redeem"
          className="w-full rounded-full border border-blush-300 px-4 py-2.5 font-sans text-[14px] focus:border-coral-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={applying || !preview || preview.requested_points === 0}
          onClick={async () => {
            if (!preview || preview.requested_points === 0) return;
            setApplying(true);
            setError(null);
            try {
              await applyLoyaltyRedemption(cartId, preview.requested_points);
              onApplied();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not apply");
            } finally {
              setApplying(false);
            }
          }}
          className="shrink-0 rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>

      {previewing && (
        <p className="mt-2 font-sans text-[12px] text-ink-muted">Calculating…</p>
      )}

      {preview && !previewing && (
        <p className="mt-2 font-sans text-[12px] text-ink-soft">
          {preview.requested_points.toLocaleString("en-MU")} pts → −Rs{" "}
          {preview.discount_mur.toLocaleString("en-MU")} off · max{" "}
          {preview.max_redeemable.toLocaleString("en-MU")} pts allowed (50% cap)
        </p>
      )}

      {error && (
        <p className="mt-2 font-sans text-[12px] text-coral-700">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount the widget in CheckoutForm.tsx**

Open `src/app/checkout/CheckoutForm.tsx`. The form currently renders the order summary on the right; mount `<LoyaltyRedeemBox />` ABOVE the place-order button on mobile and inside the right column above `<OrderSummary />` on desktop.

- Read the cart from the existing `CartProvider` to get `cartId`.
- Track `alreadyApplied` from `cart.metadata?.loyalty_redeem`. If present, pass `applied={{ points, discount_mur }}`.
- The `onApplied` callback should call the existing cart-refetch (the one already used after `cart.update`).

```tsx
// At top of CheckoutForm.tsx, with the other imports:
import { LoyaltyRedeemBox } from "@/components/checkout/LoyaltyRedeemBox";

// Where you already have access to the cart object (state from CartProvider):
const redeemMeta = cart?.metadata?.loyalty_redeem as
  | { points: number; discount_mur: number }
  | undefined;

// Render slot — adjust placement to match the existing layout.
// If the form has a right-rail container with <OrderSummary />, drop this
// directly above <OrderSummary />. If it's a single-column mobile flow,
// drop it above the "Place Order" button.
{cart?.id && (
  <LoyaltyRedeemBox
    cartId={cart.id}
    alreadyApplied={!!redeemMeta}
    applied={redeemMeta}
    onApplied={refreshCart /* the existing function — name may differ */}
  />
)}
```

**CRITICAL:** Audit every `cart.update(...)` call in `CheckoutForm.tsx`. If any of them passes a `metadata: {...}` object that doesn't spread the previous `metadata`, it WILL wipe `loyalty_redeem`. Always merge:

```ts
await cart.update({
  metadata: { ...(cart.metadata ?? {}), notes: trimmedNotes },
  /* other fields */
});
```

- [ ] **Step 3: Show the line in OrderSummary.tsx**

Open `src/app/checkout/OrderSummary.tsx`. Find where subtotal/shipping/total are rendered. Add a row, only when `cart.metadata.loyalty_redeem` is present, between subtotal and total:

```tsx
{(() => {
  const r = cart?.metadata?.loyalty_redeem as { discount_mur: number } | undefined;
  if (!r) return null;
  return (
    <div className="flex items-center justify-between text-coral-500">
      <span className="font-sans text-[13px]">Doll Rewards</span>
      <span className="font-sans text-[13px]">
        −Rs {r.discount_mur.toLocaleString("en-MU")}
      </span>
    </div>
  );
})()}
```

The actual cart `total` from Medusa already reflects the adjustment (the backend stamped a real cart adjustment), so don't subtract again — only display.

- [ ] **Step 4: Type-check + dev smoke**

```bash
npx tsc --noEmit
npm run dev
```

Smoke test:
1. Add a product to cart, log in as a customer with ≥ 200 points.
2. Go to `/checkout`. Widget renders with current balance.
3. Type 200 → preview shows "200 pts → −Rs 200 off · max ... allowed".
4. Click Apply → "Doll Rewards applied" view, OrderSummary shows "−Rs 200" line, cart total dropped by 200.
5. Reload page → state persists (cart metadata holds it).
6. Try to apply again → backend returns 409, UI surfaces an error (or hides the input — already-applied branch covers this).
7. Submit the order → success page shows the discount baked into total.
8. Check Medusa admin → order has the cart adjustment AND the customer's `points_balance` dropped by 200.

- [ ] **Step 5: Commit**

```bash
git add src/components/checkout/LoyaltyRedeemBox.tsx src/app/checkout/CheckoutForm.tsx src/app/checkout/OrderSummary.tsx
git commit -m "feat(loyalty): redeem points at checkout for MUR discount"
```

---

## Task 5: Personalize `LoyaltyTeaser` and `/loyalty` for logged-in users

**Files:**
- Modify: `src/components/home/LoyaltyTeaser.tsx`
- Modify: `src/app/loyalty/LoyaltySignup.tsx`

The teaser block on home and the signup form on `/loyalty` currently show the same generic content to everyone. For logged-in members, show their balance instead — they're already enrolled.

- [ ] **Step 1: Update LoyaltyTeaser.tsx**

Convert from server component to client (`"use client"`) so it can call `useCustomer()` + fetch balance. Keep the existing layout — just swap the right-side content when the user is logged in.

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

const PERKS = [
  { icon: "★", body: "Earn **1 point** per Rs 10 spent — redeem on any order." },
  { icon: "♥", body: "**Birthday surprise** every year on us." },
  { icon: "✦", body: "**Priority support** — your DMs jump the queue." },
];

function renderPerk(body: string) {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-bold text-coral-500">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function LoyaltyTeaser() {
  const { status, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);

  useEffect(() => {
    if (status !== "ready" || !customer) return;
    getMyLoyalty().then(setAccount).catch(() => setAccount(null));
  }, [status, customer]);

  const isMember = !!customer && !!account;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FCE9E4] to-cream py-10 md:py-14">
      <div className="absolute right-[-90px] top-12 h-[220px] w-[220px] rounded-full bg-coral-300/20" aria-hidden />
      <div className="relative mx-auto max-w-[1080px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="text-center md:text-left">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">★ Doll Rewards</p>
            {isMember ? (
              <>
                <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
                  You have{" "}
                  <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                    {account.points_balance.toLocaleString("en-MU")} pts
                  </em>
                </h2>
                <div className="mt-5 md:text-left">
                  <Link
                    href="/account/loyalty"
                    className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                  >
                    See history →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-[26px] leading-none text-ink md:text-[38px]">
                  Earn perks
                  <br className="hidden md:block" />
                  <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>
                    {" "}every drop.
                  </em>
                </h2>
                <div className="mt-5 md:text-left">
                  <Link
                    href="/loyalty"
                    className="inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                  >
                    Join Doll Rewards →
                  </Link>
                  <p className="mt-2 font-sans text-[10px] tracking-wider text-ink-muted">
                    Already 1,200+ members · Free to join
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="grid gap-3">
            {PERKS.map((p) => (
              <div key={p.icon} className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-[0_2px_6px_rgba(229,96,74,0.06)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 font-display text-[18px] text-white">
                  {p.icon}
                </span>
                <p className="font-sans text-[12px] leading-[1.4] text-ink md:text-[13px]">{renderPerk(p.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update LoyaltySignup.tsx**

Read the current contents first. The component currently shows email/birthday inputs that go to localStorage (per `loyalty/page.tsx` "Status note" section). When the customer is logged in, replace the form with a "You're already a member" panel showing balance + history link.

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/auth-client";
import { getMyLoyalty, type LoyaltyAccount } from "@/lib/loyalty-client";

// ... keep the existing guest-form code ...

// At the top of the rendered JSX, add a logged-in branch:
export function LoyaltySignup() {
  const { status, customer } = useCustomer();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);

  useEffect(() => {
    if (status !== "ready" || !customer) return;
    getMyLoyalty().then(setAccount).catch(() => setAccount(null));
  }, [status, customer]);

  if (customer && account) {
    return (
      <div className="rounded-2xl border border-coral-500 bg-gradient-to-br from-[#FCE9E4] to-white p-7 md:p-10">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-500">
          You're a member
        </p>
        <p className="font-display text-[40px] leading-none text-ink">
          {account.points_balance.toLocaleString("en-MU")}
          <span className="ml-2 font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            points
          </span>
        </p>
        <p className="mt-4 font-sans text-[14px] leading-[1.55] text-ink-soft">
          Lifetime earned: {account.lifetime_earned.toLocaleString("en-MU")} ·
          redeemed: {account.lifetime_redeemed.toLocaleString("en-MU")}
        </p>
        <Link
          href="/account/loyalty"
          className="mt-5 inline-block rounded-full bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        >
          See history →
        </Link>
      </div>
    );
  }

  // ... existing guest signup form (unchanged) ...
  return null; // replace with the actual existing JSX
}
```

(Read the existing file first; preserve the guest-form path verbatim and only add the logged-in branch above it.)

- [ ] **Step 3: Type-check + dev**

```bash
npx tsc --noEmit
npm run dev
```

Smoke:
- Logged out: home page teaser + `/loyalty` page render exactly as before.
- Logged in: teaser shows "You have N pts · See history →", `/loyalty` join section shows the balance card.

- [ ] **Step 4: Commit + push**

```bash
git add src/components/home/LoyaltyTeaser.tsx src/app/loyalty/LoyaltySignup.tsx
git commit -m "feat(loyalty): personalize teaser + /loyalty for logged-in members"
git push
```

---

## Final verification checklist (run all)

- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npm run build` — clean, all routes present including `/account/loyalty`
- [ ] Browser smoke as logged-in member with ≥ 500 points:
  - `/account` shows balance card
  - `/account/loyalty` shows transactions, paginates if > 20
  - `/checkout` shows redeem widget, preview updates as you type, apply works, OrderSummary shows the discount
  - Reloading checkout preserves the applied redemption
  - Order completes; admin confirms points were burned
  - `/` teaser shows balance instead of CTA
  - `/loyalty` shows "You're a member" panel
- [ ] Browser smoke as guest:
  - `/account/loyalty` redirects to `/login?redirect=/account/loyalty`
  - `/checkout` does NOT show the redeem widget
  - `/` teaser shows the original generic CTA
  - `/loyalty` shows the original signup form

---

## Rollout notes

- No env vars needed — endpoints already live on `api.dollupboutique.com`.
- No backend changes. If the loyalty module ever goes down, the frontend swallows 401/5xx and hides the surface — guest fallback paths are the safety net.
- After deploy, save a memory entry: `loyalty-frontend-shipped-YYYY-MM-DD.md` with the commit hash + what to verify on prod.
