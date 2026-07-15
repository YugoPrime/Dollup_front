# Event "Scratch & Win" — Storefront Plan (2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing `/event` loop — enter card code → give contact → earn spins (review + IG/Google) → spin a prize wheel → see the reward — against the Plan 1 backend API.

**Architecture:** A new App Router page at `src/app/event/page.tsx` (server shell) driving a `"use client"` state machine `EventLoopClient` with steps `code → contact → earn → spin → done`. A thin `event-client.ts` wraps the store API via the existing `clientSdk.client.fetch`, mirroring `loyalty-client.ts`. A purpose-built `EventWheel` component echoes the coral/ink Mystery-Box aesthetic (the existing `SpinWheel` is a product-reel and is NOT reused). Reviews post through a `ReviewForm` to `POST /store/reviews`.

**Tech Stack:** Next.js 16 (App Router, RSC, Turbopack), React 19, Tailwind v4, `@medusajs/js-sdk` via `clientSdk`.

## Global Constraints

- Package manager: **npm**. Commands from `DUB-front/`. No test runner in this repo — verify with `npx tsc --noEmit`, `npm run build`, and manual browser smoke (per `DUB-front/CLAUDE.md`). Do NOT add Jest/Vitest/Playwright.
- Next.js 16: `searchParams`/`params` are `Promise<...>` in pages. Server components by default; add `"use client"` only for state/interactivity. Read `node_modules/next/dist/docs/01-app/...` before assuming an API.
- Colors: use existing tokens only — `coral-{300,500,700}`, `blush-{100,300,400}`, `cream`, `ink/ink-soft/ink-muted`. Fonts `font-display` (Playfair), `font-sans` (DM Sans). Do not introduce new palette colors.
- Store API calls: browser-side use `clientSdk.client.fetch<T>(path, { method, body })` (auto-attaches publishable key + base URL). Backend origin must be in `STORE_CORS` (already includes the prod domain).
- The card QR points to `dollupboutique.com/event` — the loop lives at the real route `/event`. The existing giveaway hub stays at `/events` (leave it untouched; optionally cross-link).
- Reward currency is **Doll Rewards points** (Phase 1). Prize copy must say points, not % off / vouchers.
- Contact capture requires **both** email and WhatsApp/phone before the first spin.

## API contract consumed (from Plan 1 — BUILT & VERIFIED, branch `feat/event-scratch-win`)

- `POST /store/event/validate-code` `{ code }` → `200 { ok:true }` | `400/409 { message }`
- `POST /store/event/enter` `{ code, email, phone, consent }` → `200 { entry_id, spins_remaining }`
- `POST /store/event/bonus-spin` `{ entry_id, kind:"review"|"social" }` → `200 { spins_remaining }` | `400/409 { message }`
- `POST /store/event/spin` `{ entry_id }` → `200 { slice, type, points, spins_remaining, credited, credit_pending }`
- `POST /store/reviews` `{ email, rating, body, order_id?, product_id? }` → `200 { id, status }`

### Contract notes the backend build changed (READ BEFORE IMPLEMENTING)

- **Card codes are 6 chars, not 4** — format `DUB-XXXXXX` from an ambiguity-free alphabet (no `0/O/1/I`). The `CodeStep` placeholder and any validation must use 6. (Widened from 4 to kill code enumeration.)
- **`credit_pending: boolean` is new on the spin response.** The spin is committed server-side *before* the loyalty credit runs. If the credit fails, the route still returns **200** with `credited: 0` and `credit_pending: true` — the customer DID win and the spin WAS consumed.
- **NEVER auto-retry `POST /store/event/spin` on error.** A retry consumes another spin. On `credit_pending: true`, show the win normally (e.g. "You won 100 pts — landing in your account shortly") and do NOT re-spin. Admin reconciles stuck credits via `GET /admin/event/rewards?type=points&status=issued`.
- **Rate limiting is NOT yet implemented** on `validate-code`/`enter` (deferred pre-launch task). Do not rely on the backend to throttle abusive input.

---

## File structure

- `src/lib/event-client.ts` — typed wrappers for the four event endpoints (new)
- `src/lib/review-client.ts` — `submitReview` wrapper (new)
- `src/lib/event-wheel.ts` — shared slice metadata (labels, colors, emoji) (new)
- `src/app/event/page.tsx` — server shell + metadata (new)
- `src/app/event/EventLoopClient.tsx` — the step state machine (new, client)
- `src/app/event/steps/CodeStep.tsx` — code entry (new, client)
- `src/app/event/steps/ContactStep.tsx` — email + phone + consent (new, client)
- `src/app/event/steps/EarnStep.tsx` — review + IG/Google bonus cards (new, client)
- `src/app/event/steps/ReviewForm.tsx` — star + text → submitReview (new, client)
- `src/app/event/EventWheel.tsx` — prize wheel + result reveal (new, client)

---

### Task 1: `event-client.ts` + `review-client.ts` + slice metadata

**Files:**
- Create: `src/lib/event-client.ts`, `src/lib/review-client.ts`, `src/lib/event-wheel.ts`

**Interfaces:**
- Produces:
  - `validateCode(code: string): Promise<{ ok: true }>` (throws with a readable `message` on 400/409)
  - `enterCode(input: { code; email; phone; consent }): Promise<{ entry_id: string; spins_remaining: number }>`
  - `claimBonusSpin(entryId: string, kind: "review" | "social"): Promise<{ spins_remaining: number }>`
  - `spin(entryId: string): Promise<SpinResult>` where `SpinResult = { slice: string; type: "points"|"draw_entry"|"gift"; points: number; spins_remaining: number; credited: number }`
  - `submitReview(input: { email; rating; body; order_id?; product_id? }): Promise<{ id: string; status: string }>`
  - `WHEEL_SLICES: WheelSlice[]` where `WheelSlice = { key: string; label: string; sublabel: string; tone: "coral"|"ink"|"blush" }` — visual catalog matching backend slice keys `pts_50|pts_100|pts_200|draw_entry|gift`.

- [ ] **Step 1: Write `event-wheel.ts`**

```typescript
export type WheelSlice = {
  key: "pts_50" | "pts_100" | "pts_200" | "draw_entry" | "gift";
  label: string;
  sublabel: string;
  tone: "coral" | "ink" | "blush";
};

// Display order around the wheel. Keys MUST match backend SLICE_CATALOG.
export const WHEEL_SLICES: WheelSlice[] = [
  { key: "pts_50", label: "50 pts", sublabel: "Doll Rewards", tone: "blush" },
  { key: "draw_entry", label: "Grand Draw", sublabel: "You're in!", tone: "ink" },
  { key: "pts_100", label: "100 pts", sublabel: "Doll Rewards", tone: "coral" },
  { key: "gift", label: "Free Gift", sublabel: "with next order", tone: "blush" },
  { key: "pts_200", label: "200 pts", sublabel: "Doll Rewards", tone: "coral" },
];

export function sliceByKey(key: string): WheelSlice | undefined {
  return WHEEL_SLICES.find((s) => s.key === key);
}
```

- [ ] **Step 2: Write `event-client.ts`**

```typescript
"use client";

import { clientSdk } from "@/lib/cart-client";

export type SpinResult = {
  slice: string;
  type: "points" | "draw_entry" | "gift";
  points: number;
  spins_remaining: number;
  credited: number;
};

// clientSdk.client.fetch throws on non-2xx; extract the backend {message}.
function messageFrom(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length) return m;
  }
  return fallback;
}

export async function validateCode(code: string): Promise<{ ok: true }> {
  try {
    return await clientSdk.client.fetch<{ ok: true }>("/store/event/validate-code", {
      method: "POST",
      body: { code },
    });
  } catch (err) {
    throw new Error(messageFrom(err, "We couldn't check that code. Try again."));
  }
}

export async function enterCode(input: {
  code: string; email: string; phone: string; consent: boolean;
}): Promise<{ entry_id: string; spins_remaining: number }> {
  try {
    return await clientSdk.client.fetch("/store/event/enter", { method: "POST", body: input });
  } catch (err) {
    throw new Error(messageFrom(err, "Could not enter. Check your details."));
  }
}

export async function claimBonusSpin(
  entryId: string, kind: "review" | "social",
): Promise<{ spins_remaining: number }> {
  return clientSdk.client.fetch("/store/event/bonus-spin", {
    method: "POST",
    body: { entry_id: entryId, kind },
  });
}

export async function spin(entryId: string): Promise<SpinResult> {
  try {
    return await clientSdk.client.fetch<SpinResult>("/store/event/spin", {
      method: "POST",
      body: { entry_id: entryId },
    });
  } catch (err) {
    throw new Error(messageFrom(err, "Spin failed. Try again."));
  }
}
```

- [ ] **Step 3: Write `review-client.ts`**

```typescript
"use client";

import { clientSdk } from "@/lib/cart-client";

export async function submitReview(input: {
  email: string; rating: number; body: string; order_id?: string; product_id?: string;
}): Promise<{ id: string; status: string }> {
  return clientSdk.client.fetch("/store/reviews", { method: "POST", body: input });
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from the new files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/event-client.ts src/lib/review-client.ts src/lib/event-wheel.ts
git commit -m "feat(event): store API client + wheel slice metadata"
```

---

### Task 2: `/event` page shell + step state machine skeleton

**Files:**
- Create: `src/app/event/page.tsx`, `src/app/event/EventLoopClient.tsx`

**Interfaces:**
- Consumes: nothing yet (steps are stubs).
- Produces: `EventLoopClient` — holds `step` (`"code"|"contact"|"earn"|"spin"|"done"`), `entryId`, `spinsRemaining`, `code`, `email`, `phone`; renders the current step. Exposes setters passed down to step components.

- [ ] **Step 1: Write the server shell**

`src/app/event/page.tsx`:
```tsx
import type { Metadata } from "next";
import { EventLoopClient } from "./EventLoopClient";

export const metadata: Metadata = {
  title: "Scratch & Win — Doll Up",
  description: "Enter your card code, leave a review, and spin to win Doll Rewards points + monthly grand-prize entries.",
  alternates: { canonical: "/event" },
  robots: { index: false }, // entry page for card holders, not for SEO
};

export default function EventPage() {
  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-gradient-to-br from-[#FCE9E4] via-[#F8D5CD] to-[#F8B0A0] px-6 py-12 md:py-16">
        <div className="mx-auto max-w-[560px] text-center">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-soft">
            ★ From your Doll Up bag
          </p>
          <h1 className="font-display text-[38px] leading-[0.95] tracking-[-1px] text-ink md:text-[52px]">
            Scratch &amp;{" "}
            <em className="not-italic text-coral-500" style={{ fontStyle: "italic" }}>Win</em>
          </h1>
          <p className="mx-auto mt-4 max-w-[420px] font-sans text-[14px] leading-[1.55] text-ink-soft">
            Enter the code on your thank-you card to spin for Doll Rewards points and monthly grand-prize entries.
          </p>
        </div>
      </section>
      <section className="px-6 py-10 md:py-14">
        <div className="mx-auto max-w-[560px]">
          <EventLoopClient />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the state machine skeleton**

`src/app/event/EventLoopClient.tsx`:
```tsx
"use client";

import { useState } from "react";

type Step = "code" | "contact" | "earn" | "spin" | "done";

export function EventLoopClient() {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [spinsRemaining, setSpinsRemaining] = useState(0);

  return (
    <div className="rounded-3xl border border-blush-300 bg-white p-6 shadow-sm md:p-8">
      {step === "code" && <p className="font-sans text-[14px] text-ink">Code step — Task 3.</p>}
      {step === "contact" && <p className="font-sans text-[14px] text-ink">Contact step — Task 4.</p>}
      {step === "earn" && <p className="font-sans text-[14px] text-ink">Earn step — Task 5.</p>}
      {step === "spin" && <p className="font-sans text-[14px] text-ink">Spin step — Task 6.</p>}
      {step === "done" && <p className="font-sans text-[14px] text-ink">Done.</p>}
      {/* setters wired in later tasks: setStep,setCode,setEmail,setPhone,setEntryId,setSpinsRemaining */}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + eyeball in browser**

Run: `npx tsc --noEmit` then `npm run dev` and open `http://localhost:3000/event`
Expected: hero + white card showing "Code step — Task 3."

- [ ] **Step 4: Commit**

```bash
git add src/app/event
git commit -m "feat(event): /event page shell + step state machine skeleton"
```

---

### Task 3: Code entry step

**Files:**
- Create: `src/app/event/steps/CodeStep.tsx`
- Modify: `src/app/event/EventLoopClient.tsx`

**Interfaces:**
- Consumes: `validateCode` (Task 1).
- Produces: `CodeStep` props `{ code: string; setCode: (v:string)=>void; onValid: () => void }`. On submit: normalize (uppercase/trim), call `validateCode`, on success call `onValid()`; on error show the message inline.

- [ ] **Step 1: Write `CodeStep.tsx`**

```tsx
"use client";

import { useState } from "react";
import { validateCode } from "@/lib/event-client";

type Props = { code: string; setCode: (v: string) => void; onValid: () => void };

export function CodeStep({ code, setCode, onValid }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await validateCode(code.trim().toUpperCase());
      onValid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
          Your card code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="DUB-XXXX"
          autoCapitalize="characters"
          className="mt-2 w-full rounded-full border border-blush-400 bg-cream px-5 py-3 text-center font-display text-[22px] tracking-[2px] text-ink outline-none focus:border-coral-500 focus:bg-white"
        />
      </div>
      {error && <p className="font-sans text-[13px] text-coral-700">{error}</p>}
      <button
        type="submit"
        disabled={loading || code.trim().length < 4}
        className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
      >
        {loading ? "Checking…" : "Unlock my spin →"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Wire into `EventLoopClient`**

Replace the `step === "code"` line with:
```tsx
{step === "code" && (
  <CodeStep code={code} setCode={setCode} onValid={() => setStep("contact")} />
)}
```
And add the import at the top: `import { CodeStep } from "./steps/CodeStep";`

- [ ] **Step 3: Typecheck + browser**

Run: `npx tsc --noEmit`; in browser enter a real unused code → advances; a bad code → inline error.
Expected: PASS + correct behavior (requires Plan 1 backend running with a generated code).

- [ ] **Step 4: Commit**

```bash
git add src/app/event
git commit -m "feat(event): code entry step"
```

---

### Task 4: Contact capture step

**Files:**
- Create: `src/app/event/steps/ContactStep.tsx`
- Modify: `src/app/event/EventLoopClient.tsx`

**Interfaces:**
- Consumes: `enterCode` (Task 1).
- Produces: `ContactStep` props `{ code; email; setEmail; phone; setPhone; onEntered: (entryId: string, spinsRemaining: number) => void }`. Validates email + non-empty phone + consent checkbox; calls `enterCode`; on success calls `onEntered`.

- [ ] **Step 1: Write `ContactStep.tsx`**

```tsx
"use client";

import { useState } from "react";
import { enterCode } from "@/lib/event-client";

type Props = {
  code: string;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  onEntered: (entryId: string, spinsRemaining: number) => void;
};

export function ContactStep({ code, email, setEmail, phone, setPhone, onEntered }: Props) {
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/.+@.+\..+/.test(email.trim())) { setError("Enter a valid email."); return; }
    if (phone.trim().length < 5) { setError("Enter your WhatsApp / phone number."); return; }
    setLoading(true);
    try {
      const res = await enterCode({ code: code.trim().toUpperCase(), email: email.trim(), phone: phone.trim(), consent });
      onEntered(res.entry_id, res.spins_remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="font-display text-[20px] text-ink">Where do we send your reward?</p>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
        className="w-full rounded-full border border-blush-400 bg-cream px-5 py-3 font-sans text-[14px] text-ink outline-none focus:border-coral-500 focus:bg-white" />
      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp / phone (+230…)"
        className="w-full rounded-full border border-blush-400 bg-cream px-5 py-3 font-sans text-[14px] text-ink outline-none focus:border-coral-500 focus:bg-white" />
      <label className="flex items-start gap-2 font-sans text-[12px] text-ink-soft">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-[3px]" />
        Send me new drops &amp; offers by email/WhatsApp.
      </label>
      {error && <p className="font-sans text-[13px] text-coral-700">{error}</p>}
      <button type="submit" disabled={loading}
        className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40">
        {loading ? "Saving…" : "Continue →"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Wire into `EventLoopClient`**

```tsx
{step === "contact" && (
  <ContactStep
    code={code} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone}
    onEntered={(id, spins) => { setEntryId(id); setSpinsRemaining(spins); setStep("earn"); }}
  />
)}
```
Add import: `import { ContactStep } from "./steps/ContactStep";`

- [ ] **Step 3: Typecheck + browser**

Run: `npx tsc --noEmit`; enter contact → advances to "Earn step"; entryId + spins set (spins_remaining = 1).

- [ ] **Step 4: Commit**

```bash
git add src/app/event
git commit -m "feat(event): contact capture step"
```

---

### Task 5: Earn-spins step + review form

**Files:**
- Create: `src/app/event/steps/EarnStep.tsx`, `src/app/event/steps/ReviewForm.tsx`
- Modify: `src/app/event/EventLoopClient.tsx`

**Interfaces:**
- Consumes: `claimBonusSpin` (Task 1), `submitReview` (Task 1).
- Produces:
  - `ReviewForm` props `{ email: string; onSubmitted: () => void }` — star rating (1–5) + text; calls `submitReview`; on success calls `onSubmitted`.
  - `EarnStep` props `{ entryId; email; spinsRemaining; setSpinsRemaining; onSpin: () => void }`. Shows: review card (opens `ReviewForm`; on submit → `claimBonusSpin("review")` → update spins), a social card (IG tag + Google link-out buttons → `claimBonusSpin("social")` once), and a prominent "Spin now" button → `onSpin()`.

- [ ] **Step 1: Write `ReviewForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { submitReview } from "@/lib/review-client";

type Props = { email: string; onSubmitted: () => void };

export function ReviewForm({ email, onSubmitted }: Props) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 3) { setError("Tell us a little more."); return; }
    setLoading(true); setError(null);
    try {
      await submitReview({ email, rating, body: body.trim() });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}
            className={`text-[26px] leading-none ${n <= rating ? "text-coral-500" : "text-blush-300"}`}>★</button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000}
        placeholder="How was your Doll Up order?"
        className="w-full resize-y rounded-2xl border border-blush-400 bg-cream px-4 py-3 font-sans text-[14px] text-ink outline-none focus:border-coral-500 focus:bg-white" />
      {error && <p className="font-sans text-[12px] text-coral-700">{error}</p>}
      <button type="submit" disabled={loading}
        className="self-start rounded-full bg-ink px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40">
        {loading ? "Sending…" : "Submit review (+1 spin)"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write `EarnStep.tsx`**

```tsx
"use client";

import { useState } from "react";
import { claimBonusSpin } from "@/lib/event-client";
import { ReviewForm } from "./ReviewForm";

type Props = {
  entryId: string;
  email: string;
  spinsRemaining: number;
  setSpinsRemaining: (n: number) => void;
  onSpin: () => void;
};

const IG_URL = "https://www.instagram.com/dollupboutique/";
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=REPLACE_WITH_PLACE_ID";

export function EarnStep({ entryId, email, spinsRemaining, setSpinsRemaining, onSpin }: Props) {
  const [showReview, setShowReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [socialDone, setSocialDone] = useState(false);

  async function claim(kind: "review" | "social") {
    const res = await claimBonusSpin(entryId, kind);
    setSpinsRemaining(res.spins_remaining);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-[22px] text-ink">You've got {spinsRemaining} spin{spinsRemaining === 1 ? "" : "s"}</p>
        <span className="rounded-full bg-coral-500/10 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-coral-700">Earn more ↓</span>
      </div>

      {/* Review card */}
      <div className="rounded-2xl border border-blush-300 bg-cream/60 p-4">
        <p className="font-sans text-[13px] font-semibold text-ink">✍️ Leave a review — <span className="text-coral-700">+1 spin</span></p>
        {reviewDone ? (
          <p className="mt-2 font-sans text-[13px] text-ink-soft">Thanks! Bonus spin added.</p>
        ) : !showReview ? (
          <button onClick={() => setShowReview(true)}
            className="mt-3 rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-ink hover:text-white">
            Write a review
          </button>
        ) : (
          <ReviewForm email={email} onSubmitted={async () => { await claim("review"); setReviewDone(true); setShowReview(false); }} />
        )}
      </div>

      {/* Social card */}
      <div className="rounded-2xl border border-blush-300 bg-cream/60 p-4">
        <p className="font-sans text-[13px] font-semibold text-ink">📸 Tag us or review on Google — <span className="text-coral-700">+1 spin</span></p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={IG_URL} target="_blank" rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-ink hover:text-white">Tag @dollupboutique</a>
          <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"
            className="rounded-full border border-ink/20 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-ink hover:text-white">Review on Google</a>
        </div>
        {socialDone ? (
          <p className="mt-2 font-sans text-[13px] text-ink-soft">Bonus spin added.</p>
        ) : (
          <button onClick={async () => { await claim("social"); setSocialDone(true); }}
            className="mt-3 font-sans text-[12px] font-semibold text-coral-700 underline">I did it — give my +1 spin</button>
        )}
      </div>

      <button onClick={onSpin}
        className="rounded-full bg-coral-500 px-6 py-4 font-sans text-[13px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-coral-700">
        Spin the wheel →
      </button>
    </div>
  );
}
```
> The `GOOGLE_REVIEW_URL` placeholder MUST be replaced with the real Google "write a review" deep link for Doll Up's Business Profile before ship. Leaving the placeholder is a ship-blocker (tracked in Task 7 smoke).

- [ ] **Step 3: Wire into `EventLoopClient`**

```tsx
{step === "earn" && entryId && (
  <EarnStep entryId={entryId} email={email} spinsRemaining={spinsRemaining}
    setSpinsRemaining={setSpinsRemaining} onSpin={() => setStep("spin")} />
)}
```
Add import: `import { EarnStep } from "./steps/EarnStep";`

- [ ] **Step 4: Typecheck + browser**

Run: `npx tsc --noEmit`; submit a review → spins go 1→2; click social claim → 2→3; "Spin the wheel" advances.

- [ ] **Step 5: Commit**

```bash
git add src/app/event
git commit -m "feat(event): earn-spins step + review form"
```

---

### Task 6: Prize wheel + result reveal

**Files:**
- Create: `src/app/event/EventWheel.tsx`
- Modify: `src/app/event/EventLoopClient.tsx`

**Interfaces:**
- Consumes: `spin` (Task 1), `WHEEL_SLICES` / `sliceByKey` (Task 1).
- Produces: `EventWheel` props `{ entryId: string; spinsRemaining: number; onSpent: (remaining: number) => void }`. Renders the slice ring, a "Spin" button (disabled while spinning or when `spinsRemaining === 0`), calls `spin(entryId)`, animates the pointer to the returned `slice`, then reveals a result card (points credited / draw entry / gift). Lets the user spin again while spins remain.

- [ ] **Step 1: Write `EventWheel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { spin as apiSpin, type SpinResult } from "@/lib/event-client";
import { WHEEL_SLICES, sliceByKey } from "@/lib/event-wheel";

type Props = { entryId: string; spinsRemaining: number; onSpent: (remaining: number) => void };

const TONE: Record<string, string> = {
  coral: "bg-coral-500 text-white",
  ink: "bg-ink text-white",
  blush: "bg-blush-100 text-ink",
};

export function EventWheel({ entryId, spinsRemaining, onSpent }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  async function doSpin() {
    if (spinning || spinsRemaining <= 0) return;
    setSpinning(true); setError(null); setResult(null); setHighlight(null);
    try {
      const res = await apiSpin(entryId);
      // simple suspense cycle through slices, then land on the real one
      let ticks = 0;
      const order = WHEEL_SLICES.map((s) => s.key);
      const timer = setInterval(() => {
        setHighlight(order[ticks % order.length]);
        ticks++;
        if (ticks > 14) {
          clearInterval(timer);
          setHighlight(res.slice);
          setResult(res);
          setSpinning(false);
          onSpent(res.spins_remaining);
        }
      }, 110);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spin failed.");
      setSpinning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {WHEEL_SLICES.map((s) => (
          <div key={s.key}
            className={`rounded-2xl p-4 text-center transition-transform ${TONE[s.tone]} ${highlight === s.key ? "scale-105 ring-4 ring-coral-300" : "opacity-90"}`}>
            <p className="font-display text-[20px] leading-tight">{s.label}</p>
            <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">{s.sublabel}</p>
          </div>
        ))}
      </div>

      {result ? (
        <ResultCard result={result} />
      ) : (
        <p className="font-sans text-[13px] text-ink-soft">{spinsRemaining} spin{spinsRemaining === 1 ? "" : "s"} left</p>
      )}
      {error && <p className="font-sans text-[13px] text-coral-700">{error}</p>}

      {spinsRemaining > 0 && (
        <button onClick={doSpin} disabled={spinning}
          className="rounded-full bg-coral-500 px-8 py-4 font-sans text-[13px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40">
          {spinning ? "Spinning…" : result ? "Spin again →" : "Spin →"}
        </button>
      )}
      {spinsRemaining === 0 && result && (
        <a href="/shop" className="rounded-full border border-ink/20 px-6 py-3 font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-ink transition hover:bg-ink hover:text-white">
          Shop with my points →
        </a>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SpinResult }) {
  const slice = sliceByKey(result.slice);
  const headline =
    result.type === "points" ? `+${result.points} Doll Rewards points!` :
    result.type === "draw_entry" ? "You're in the grand draw! 🎉" :
    "Free gift with your next order! 🎁";
  const sub =
    result.type === "points" ? "Credited to your Doll Rewards — use them at checkout." :
    result.type === "draw_entry" ? "We'll announce the winner at month end on Instagram." :
    "We'll add it to your next order automatically.";
  return (
    <div className="w-full rounded-2xl border border-coral-500 bg-coral-500/5 p-5 text-center">
      <p className="font-display text-[26px] leading-tight text-ink">{headline}</p>
      <p className="mt-2 font-sans text-[13px] text-ink-soft">{sub}</p>
      {slice && <p className="mt-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-700">{slice.label}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `EventLoopClient`**

```tsx
{step === "spin" && entryId && (
  <EventWheel entryId={entryId} spinsRemaining={spinsRemaining}
    onSpent={(remaining) => setSpinsRemaining(remaining)} />
)}
```
Add import: `import { EventWheel } from "./EventWheel";`

- [ ] **Step 3: Typecheck + browser end-to-end**

Run: `npx tsc --noEmit`; full flow: code → contact → earn (+2 bonus) → spin 3× → each reveal correct; "Spin again" only while spins remain; at 0 spins the "Shop with my points" CTA shows.

- [ ] **Step 4: Commit**

```bash
git add src/app/event
git commit -m "feat(event): prize wheel + result reveal, full loop wired"
```

---

### Task 7: Build, cross-link, and pre-ship smoke

**Files:**
- Modify: `src/components/home/MysteryBoxTeaser.tsx` or `src/app/events/page.tsx` (add a small cross-link to `/event` from the giveaway hub — optional, one line)
- Modify: `src/app/event/steps/EarnStep.tsx` (replace `GOOGLE_REVIEW_URL` placeholder)

- [ ] **Step 1: Replace the Google review placeholder**

In `EarnStep.tsx`, set `GOOGLE_REVIEW_URL` to Doll Up's real Business Profile review link
(`https://search.google.com/local/writereview?placeid=<PLACE_ID>` or the `g.page/...review` short link). Confirm it opens the review composer on mobile.

- [ ] **Step 2: Add a cross-link from `/events` hub (optional)**

In `src/app/events/page.tsx` footer CTA section, add next to "Join Doll Rewards":
```tsx
<Link href="/event" className="mt-3 inline-block font-sans text-[12px] font-semibold text-coral-700 underline">
  Have a card code? Scratch &amp; win →
</Link>
```

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds; `/event` compiles as a route.

- [ ] **Step 4: Manual smoke (dev server + Plan 1 backend)**

Happy path: `/event` → real code → contact → review (+1) → social (+1) → spin ×3 → points reveal → Medusa admin shows the customer with credited Doll Rewards points + a `ProductReview` row (pending). Edge cases: bad code → inline error; used code (re-enter same code) → 409 message; spin when 0 left → button hidden; draw_entry slice → "you're in" copy + `EventDrawEntry` row in DB.

- [ ] **Step 5: Commit**

```bash
git add src/app/event src/app/events/page.tsx
git commit -m "feat(event): real Google review link + hub cross-link + ship polish"
```

---

## Self-review notes (coverage vs spec)

- Spec §2 loop (code→contact→earn→spin→reveal) → Tasks 3–6. ✅
- Spec §3 points-only rewards → wheel copy says points; `ResultCard` covers points/draw/gift. ✅
- Spec §4 reviews: on-site review (ReviewForm→`/store/reviews`) = rewarded; Google = link-out; IG = link-out + self-attested bonus. ✅
- Spec §8 anti-abuse: server decides slice; client only animates to the returned key; spins gated by backend `spins_remaining`. ✅
- Route: loop at real `/event` (matches QR), `/events` hub preserved + cross-linked. Supersedes the spec's `/event→/events` redirect note (no redirect needed). ✅
- No new palette colors; existing tokens only. ✅

**Open item for the implementer:** the real Google review deep link (Task 7 Step 1) — get the Place ID from Doll Up's Google Business Profile.
```
```
