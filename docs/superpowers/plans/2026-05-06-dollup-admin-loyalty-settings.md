# dollup-admin Loyalty Settings Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the loyalty program settings (5 numeric knobs: earn rate, redeem rate, min redeem, welcome bonus, expiry) from the Medusa-built-in admin customer widget into a dedicated page at `dollup-admin/settings/loyalty`. The widget mixes per-customer balance/adjustments with global program settings, which is clunky — settings belong on a settings page.

**Architecture:** Pure frontend work in the `dollup-admin` Next.js 16 repo. Backend `GET/POST /admin/loyalty/settings` already exists and stays untouched. The new page lives under the auth-required `(app)` route group, hits the existing endpoint via `getAdminSdk()` (cached admin JWT), and uses the same form pattern the widget already proved out. The Medusa customer widget keeps its per-customer balance + adjustment UI but the program-settings panel inside it gets removed (one source of truth for program settings).

**Tech Stack:** Next.js 16 App Router (RSC + server actions), React 19, TypeScript 5, Tailwind v4 with the `cream`/`blush-400`/`coral-500`/`ink` tokens already in dollup-admin. `@medusajs/js-sdk@2.13.1`. No test runner — verification is `npx tsc --noEmit`, `npm run build`, manual browser smoke (matches the dollup-admin convention).

**Verification approach:** dollup-admin has no test runner. Each task ends with `npx tsc --noEmit` + a manual verification step. The "write failing test first" pattern from generic templates does not apply here.

**Pre-flight (do once before Task 1):**
- Read `dollup-admin/src/app/(app)/layout.tsx` and `dollup-admin/src/components/AdminTopNav.tsx` — that's where the Settings nav link lives.
- Read `dollup-admin/src/lib/medusa-admin.ts` — `getAdminSdk()` is the only way to call admin API from server code; it caches a JWT.
- Read `Backend/dollup-medusa/src/api/admin/loyalty/settings/route.ts` — the contract you're consuming. GET returns `{ settings: {...} }`, POST accepts the same partial shape and returns the updated row. Field names are exact: `earn_rate_per_100_mur`, `redeem_rate_mur_per_100_pts`, `min_redeem_points`, `welcome_bonus_points`, `points_expiry_months` (nullable).
- Read `Backend/dollup-medusa/src/admin/widgets/customer-loyalty.tsx` lines 200–270 — the existing form UX you're porting. Match labels and field order to avoid retraining the founder.
- `cd dollup-admin && npm run dev` — runs on `localhost:3001`. Backend must also be running (`localhost:9000`).
- Confirm an admin can log in at `localhost:3001/login` first.

---

## Decisions

1. **Server actions, not client `fetch`.** dollup-admin's existing pattern (see `src/app/(app)/orders/actions.ts`) is `"use server"` actions calling `getAdminSdk()`. Mirror that — keeps admin JWT off the client.
2. **No new auth.** The `(app)` route group is already protected by `proxy.ts` HMAC session. Drop the page in there.
3. **Toast pattern unknown.** dollup-admin has no toast library configured. Use inline status text (success / error message) inside the form — same approach as the existing orders pages. Don't add a toast dep.
4. **Don't delete the Medusa customer widget yet.** Keep the per-customer balance + adjustment UI in the widget; only remove the program-settings panel + Save button from it. Founder may still want the per-customer affordances available inside the Medusa customer view.
5. **Field validation:** numbers ≥ 0, integers only. `points_expiry_months` allows empty string (= null = no expiry). Backend already validates; frontend just gives early feedback.

---

## File Map

### dollup-admin/
| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/loyalty-settings.ts` | Server-only fetcher + updater wrapping `getAdminSdk().client.fetch("/admin/loyalty/settings")` | **Create** |
| `src/app/(app)/settings/layout.tsx` | Settings group shell — left nav showing "Loyalty" (and future tabs) | **Create** |
| `src/app/(app)/settings/loyalty/page.tsx` | Server shell that loads current settings, renders form | **Create** |
| `src/app/(app)/settings/loyalty/LoyaltySettingsForm.tsx` | Client form — 5 number fields + Save | **Create** |
| `src/app/(app)/settings/loyalty/actions.ts` | `"use server"` action `saveLoyaltySettingsAction(formData)` | **Create** |
| `src/components/AdminTopNav.tsx` | Add `Settings` link between Prep and Sign out | **Modify** |

### Backend/dollup-medusa/
| File | Purpose | Action |
| --- | --- | --- |
| `src/admin/widgets/customer-loyalty.tsx` | Strip lines 201–271 (the program-settings panel + handler + state). Keep the per-customer balance card + transaction table + Adjust dialog. | **Modify** |

---

## Task 1: Build the server-side settings client

**Files:**
- Create: `dollup-admin/src/lib/loyalty-settings.ts`

This module is the single point of contact with the Medusa loyalty settings endpoint. Server-only (uses `getAdminSdk`).

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/lib/loyalty-settings.ts
import "server-only";
import { getAdminSdk } from "./medusa-admin";

export type LoyaltySettings = {
  earn_rate_per_100_mur: number;
  redeem_rate_mur_per_100_pts: number;
  min_redeem_points: number;
  welcome_bonus_points: number;
  points_expiry_months: number | null;
};

export type UpdateLoyaltySettingsInput = Partial<LoyaltySettings>;

type ApiResponse = { settings: LoyaltySettings };

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const sdk = await getAdminSdk();
  const res = await sdk.client.fetch<ApiResponse>("/admin/loyalty/settings", {
    method: "GET",
  });
  return res.settings;
}

export async function updateLoyaltySettings(
  input: UpdateLoyaltySettingsInput,
): Promise<LoyaltySettings> {
  const sdk = await getAdminSdk();
  const res = await sdk.client.fetch<ApiResponse>("/admin/loyalty/settings", {
    method: "POST",
    body: input,
  });
  return res.settings;
}
```

- [ ] **Step 2: Type-check**

```bash
cd dollup-admin
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/loyalty-settings.ts
git commit -m "feat(loyalty-settings): add server-side fetch + update wrapper"
```

---

## Task 2: Build the server action

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/loyalty/actions.ts`

Form posts here. Action validates, calls `updateLoyaltySettings`, returns a status object the form renders.

- [ ] **Step 1: Create the file**

```ts
// dollup-admin/src/app/(app)/settings/loyalty/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/admin-session";
import {
  updateLoyaltySettings,
  type LoyaltySettings,
} from "@/lib/loyalty-settings";

export type SaveResult =
  | { ok: true; settings: LoyaltySettings }
  | { ok: false; error: string };

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}

function parsePositiveInt(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function saveLoyaltySettingsAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const earn = parsePositiveInt(formData.get("earn_rate_per_100_mur"));
  const redeem = parsePositiveInt(formData.get("redeem_rate_mur_per_100_pts"));
  const minRedeem = parsePositiveInt(formData.get("min_redeem_points"));
  const welcome = parsePositiveInt(formData.get("welcome_bonus_points"));
  const expiryRaw = formData.get("points_expiry_months");
  const expiryStr = expiryRaw?.toString().trim() ?? "";
  const expiry = expiryStr === "" ? null : parsePositiveInt(expiryRaw);

  if (
    earn === null ||
    redeem === null ||
    minRedeem === null ||
    welcome === null ||
    (expiryStr !== "" && expiry === null)
  ) {
    return {
      ok: false,
      error: "All numeric fields must be non-negative whole numbers.",
    };
  }

  try {
    const settings = await updateLoyaltySettings({
      earn_rate_per_100_mur: earn,
      redeem_rate_mur_per_100_pts: redeem,
      min_redeem_points: minRedeem,
      welcome_bonus_points: welcome,
      points_expiry_months: expiry,
    });
    revalidatePath("/settings/loyalty");
    return { ok: true, settings };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save settings",
    };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

If `verifySessionToken` / `ADMIN_SESSION_COOKIE` aren't on the import path you used, look at `src/app/(app)/orders/actions.ts` for the canonical import + `requireAdmin` pattern and copy it verbatim.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/settings/loyalty/actions.ts
git commit -m "feat(loyalty-settings): add saveLoyaltySettingsAction with admin guard"
```

---

## Task 3: Build the client form component

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/loyalty/LoyaltySettingsForm.tsx`

Driven by `useActionState` (React 19) so the action's return value shows up as feedback inline. Five number inputs + a Save button.

- [ ] **Step 1: Create the file**

```tsx
// dollup-admin/src/app/(app)/settings/loyalty/LoyaltySettingsForm.tsx
"use client";

import { useActionState } from "react";
import {
  saveLoyaltySettingsAction,
  type SaveResult,
} from "./actions";
import type { LoyaltySettings } from "@/lib/loyalty-settings";

type Props = { initial: LoyaltySettings };

const FIELDS: Array<{
  name: keyof LoyaltySettings;
  label: string;
  hint: string;
  placeholder?: string;
  allowEmpty?: boolean;
}> = [
  {
    name: "earn_rate_per_100_mur",
    label: "Earn rate (points per Rs 100)",
    hint: "Default 1 — customers earn 1 point per Rs 100 spent.",
  },
  {
    name: "redeem_rate_mur_per_100_pts",
    label: "Redeem rate (Rs per 100 points)",
    hint: "Default 50 — 100 points = Rs 50 off.",
  },
  {
    name: "min_redeem_points",
    label: "Minimum redemption (points)",
    hint: "Default 500 — customers must have at least this many before redeeming.",
  },
  {
    name: "welcome_bonus_points",
    label: "Welcome bonus (points)",
    hint: "Default 100 — credited automatically on registration.",
  },
  {
    name: "points_expiry_months",
    label: "Expiry (months)",
    hint: "Leave blank for no expiry. Default: blank.",
    placeholder: "No expiry",
    allowEmpty: true,
  },
];

function fieldValue(
  settings: LoyaltySettings,
  name: keyof LoyaltySettings,
): string {
  const raw = settings[name];
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

export function LoyaltySettingsForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState<SaveResult | null, FormData>(
    saveLoyaltySettingsAction,
    null,
  );

  // Display the latest persisted values from server state, falling back to initial.
  const current = state?.ok ? state.settings : initial;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.name} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
              {f.label}
            </span>
            <input
              type="number"
              name={f.name}
              min={0}
              step={1}
              defaultValue={fieldValue(current, f.name)}
              placeholder={f.placeholder}
              className="rounded-md border border-blush-400 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-[11px] text-ink-muted dark:text-zinc-500">
              {f.hint}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-blush-400 pt-4 dark:border-zinc-800">
        <div className="text-[12px]" role="status" aria-live="polite">
          {state?.ok && (
            <span className="text-emerald-600 dark:text-emerald-400">
              Saved.
            </span>
          )}
          {state && !state.ok && (
            <span className="text-coral-700 dark:text-coral-400">
              {state.error}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-coral-500 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white transition hover:bg-coral-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

If `useActionState` complains, double-check React 19 — package.json shows `react: 19.2.4`, so it's available.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/settings/loyalty/LoyaltySettingsForm.tsx
git commit -m "feat(loyalty-settings): add client form with useActionState"
```

---

## Task 4: Build the page + settings layout shell

**Files:**
- Create: `dollup-admin/src/app/(app)/settings/layout.tsx`
- Create: `dollup-admin/src/app/(app)/settings/loyalty/page.tsx`

The settings layout has a left rail listing Settings sections — for now just "Loyalty", but ready to add `email`, `shipping`, `store` later (those land in a separate plan). Page is a server component that calls `getLoyaltySettings()` and hands the result to the form.

- [ ] **Step 1: Create the settings layout**

```tsx
// dollup-admin/src/app/(app)/settings/layout.tsx
import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/settings/loyalty", label: "Loyalty" },
  // Email / Shipping / Store will land in a separate plan
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-5">
      <h1 className="mb-6 font-display text-2xl text-ink dark:text-zinc-100">
        Settings
      </h1>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside>
          <nav className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-wider text-ink-muted dark:text-zinc-400">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1.5 hover:bg-blush-400/30 hover:text-coral-700 dark:hover:bg-zinc-800 dark:hover:text-coral-400"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

```tsx
// dollup-admin/src/app/(app)/settings/loyalty/page.tsx
import { getLoyaltySettings } from "@/lib/loyalty-settings";
import { LoyaltySettingsForm } from "./LoyaltySettingsForm";

export const dynamic = "force-dynamic";

export default async function LoyaltySettingsPage() {
  const initial = await getLoyaltySettings();

  return (
    <div className="rounded-lg border border-blush-400 bg-cream/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
      <header className="mb-5">
        <h2 className="font-display text-xl text-ink dark:text-zinc-100">
          Doll Rewards program settings
        </h2>
        <p className="mt-1 text-[12px] text-ink-muted dark:text-zinc-400">
          These values drive earning, redemption, and welcome credit across
          the storefront. Changes apply immediately.
        </p>
      </header>
      <LoyaltySettingsForm initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + dev**

```bash
npx tsc --noEmit
npm run dev
```

Visit `http://localhost:3001/settings/loyalty` while signed in. Expected:
- Settings layout with "Loyalty" in the left rail
- Header + 5 number fields populated with current values
- Save button at the bottom right

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/layout.tsx src/app/(app)/settings/loyalty/page.tsx
git commit -m "feat(loyalty-settings): /settings/loyalty page + settings layout shell"
```

---

## Task 5: Wire `Settings` link into top nav

**Files:**
- Modify: `dollup-admin/src/components/AdminTopNav.tsx`

Add a `Settings` link between `Prep` and the sign-out form. Match the existing visual treatment.

- [ ] **Step 1: Edit the file**

Open `src/components/AdminTopNav.tsx`. Find the `<nav>` block containing the Orders + Prep links. Add:

```tsx
<Link
  href="/settings/loyalty"
  className="rounded-md px-2 py-1 hover:text-coral-700 dark:hover:text-coral-400"
>
  Settings
</Link>
```

immediately after the `Prep` link.

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Open any admin page → top nav shows Orders / Prep / Settings. Click Settings → lands on `/settings/loyalty` with the form rendered.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminTopNav.tsx
git commit -m "feat(nav): add Settings link to admin top nav"
```

---

## Task 6: End-to-end smoke test

- [ ] **Step 1: Save a value**

In `npm run dev`, change "Welcome bonus" from 100 to 250, click Save. Expected: green "Saved." status appears.

- [ ] **Step 2: Refresh the page**

Hard reload. Expected: the new value (250) is rendered in the form (proves the GET works after the POST).

- [ ] **Step 3: Verify in storefront**

Register a new test customer at `shop.dollupboutique.com/register` (or local storefront). After register, hit `GET /store/loyalty/me` (via storefront `/account` page, or directly via curl with the JWT) — expected `points_balance` = 250. This proves the storefront is honoring the new welcome bonus.

- [ ] **Step 4: Restore default**

Change "Welcome bonus" back to 100, save again. Verify the form still shows 100 after reload.

- [ ] **Step 5: Validation smoke**

Try saving with "Welcome bonus" blank → expect inline red error "All numeric fields must be non-negative whole numbers." Try saving with `-50` → same error.

---

## Task 7: Strip the program-settings panel from the Medusa widget

**Files:**
- Modify: `Backend/dollup-medusa/src/admin/widgets/customer-loyalty.tsx`

The widget currently shows BOTH per-customer balance/adjustments AND the global program settings form. Two sources of truth confuses the founder. Remove the program-settings panel; keep the per-customer affordances.

- [ ] **Step 1: Edit the widget**

Open `Backend/dollup-medusa/src/admin/widgets/customer-loyalty.tsx`. Make these changes:

1. **Remove the program settings JSX block** — lines 201–271 (the `<div className="px-6 py-4">` containing the "Program settings" heading + Save button + 5 SettingsField components). Replace with nothing (just delete).

2. **Remove the dependent state + handlers** (now unused):
   - `settings` state (line 80)
   - `settingsForm` state (lines 81–87)
   - `settingsSaving` state (line 88)
   - `submitSettings` function (lines 113–139)
   - The settings GET inside `load()` — keep just the per-customer fetch:
     ```ts
     // Replace the Promise.all with just:
     const json = (await fetcher(
       `/admin/loyalty/accounts/${customer.id}`,
     )) as LoyaltyResponse
     setResp(json)
     ```
   - Remove the unused imports: `Label`, `Input`, `toSettingsForm`, `LoyaltySettings`, `LoyaltySettingsResponse` types.
   - Remove the `SettingsField` component definition (lines 382–406) and `toSettingsForm` helper (lines 408–419).

3. **Add a small "Program settings" hint at the bottom of the widget**, pointing to dollup-admin:

   ```tsx
   <div className="px-6 py-3 text-ui-fg-subtle">
     <Text size="small">
       Program settings (earn rate, redeem rate, etc.) are managed at{" "}
       <a
         href="https://admin.dollupboutique.com/settings/loyalty"
         target="_blank"
         rel="noreferrer"
         className="underline"
       >
         admin.dollupboutique.com/settings/loyalty
       </a>
       .
     </Text>
   </div>
   ```

   Place this between the stats grid and the "Recent activity" section.

- [ ] **Step 2: Build the backend**

```bash
cd Backend/dollup-medusa
node .yarn/releases/yarn-4.12.0.cjs build 2>&1 | tail -20
```

Expected: clean build, no unused-import errors.

- [ ] **Step 3: Smoke the Medusa admin**

```bash
node .yarn/releases/yarn-4.12.0.cjs dev
```

Open `localhost:9000/app`, navigate to a customer detail page. The "Doll Rewards" widget should still show:
- Balance / Lifetime earned / Lifetime redeemed stats
- "Adjust points" button + dialog
- Recent activity table
- A small "Program settings managed at admin.dollupboutique.com" line near the bottom

The "Program settings" form is gone.

- [ ] **Step 4: Commit + push backend**

```bash
git add src/admin/widgets/customer-loyalty.tsx
git commit -m "refactor(loyalty): move program settings out of customer widget to dollup-admin"
git push
```

(Coolify will rebuild + redeploy `api.dollupboutique.com`.)

---

## Task 8: Push dollup-admin

- [ ] **Step 1: Push**

```bash
cd dollup-admin
git push
```

(Coolify will rebuild + redeploy `admin.dollupboutique.com`.)

- [ ] **Step 2: Live smoke**

After both deploys are green:
1. Visit `https://admin.dollupboutique.com/settings/loyalty` → form renders with current values
2. Change "Min redemption" → save → reload → new value stuck
3. Visit `https://api.dollupboutique.com/app` → customer detail → loyalty widget shows balance + "managed at..." hint, no settings form

---

## Final verification checklist

- [ ] `npx tsc --noEmit` exit 0 in dollup-admin
- [ ] `npm run build` clean in dollup-admin, route `/settings/loyalty` shows in build manifest
- [ ] Backend build clean (`yarn build`), Medusa admin loads without console errors
- [ ] dollup-admin top nav shows Settings between Prep and Sign out
- [ ] Save round-trip works (write → GET on reload returns the new values)
- [ ] Validation rejects empty / negative / non-integer values
- [ ] Medusa admin customer widget no longer has the program-settings form

---

## Memory entry to save after merge

```
name: Loyalty settings migrated to dollup-admin (YYYY-MM-DD)
description: /settings/loyalty page lives in dollup-admin; Medusa customer widget stripped of program settings
type: project

dollup-admin owns the program-settings UI now. Medusa customer widget shows only per-customer balance + adjustments. Both paths hit the same /admin/loyalty/settings backend endpoint.

Why: one source of truth for program settings; widget mixed per-customer and global concerns.

How to apply: when adding more loyalty knobs in future, update both the LoyaltySettings type in dollup-admin/src/lib/loyalty-settings.ts AND the FIELDS array in LoyaltySettingsForm.tsx — backend route auto-passes through whatever fields you POST.
```
