# Mystery Box Spin Wheel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mystery Box spin-wheel mechanic teased on `/events` — customer picks a size, spins a wheel that randomly draws 5 in-stock products, and locks the box for Rs 3,500 flat. MVP routes the lock-in to a pre-filled WhatsApp DM (no automated checkout); the founder fulfills manually. Phase 2 (out of scope here, documented at the end) adds a backend `/store/mystery-box` cart endpoint.

**Architecture:** A new `/events/mystery-box` route with a client component that reads a server-rendered pool of in-stock products (filtered by size + region MU). Spin animation is pure CSS/JS (no canvas). Per-session limit of 3 spins per day stored in `localStorage` keyed by ISO date. Lock-in builds a deep-link to `https://wa.me/<MU_PHONE>?text=<encoded message>` listing chosen SKUs.

**Tech Stack:** Next.js 16 App Router (RSC for the product pool, client for the wheel), React 19, TypeScript 5, Tailwind v4 (existing tokens). No animation library — `setInterval` + CSS `transform: translateY()` for the strip animation. No new deps. No test runner — verification is `tsc --noEmit`, `next build`, manual browser smoke.

**Verification approach:** This codebase has no test runner. Each task ends with `tsc --noEmit` + a manual verification step. The "write failing test first" pattern from generic templates does not apply here.

**Pre-flight (do once before Task 1):**
- Read `src/app/events/page.tsx` — that's where the existing "Coming soon" copy lives. We're not deleting it; we're replacing the placeholder CTA with a "Try the wheel →" link.
- Read `src/lib/products.ts` — the existing server-side product fetch helpers. We need to filter by size and stock.
- Read `src/lib/wishlist-client.ts` — same pattern (`localStorage` + `useSyncExternalStore`) for the spins-remaining counter.
- Confirm a `NEXT_PUBLIC_WHATSAPP_NUMBER` env var exists or add one (`+230xxxxxxx`). Founder's number — used for the WhatsApp deep link.
- Have at least 30 in-stock products with size variants in dev to make the spin pool meaningful.

---

## Scope decision: WhatsApp handoff vs. backend cart

**MVP (this plan):** When the customer locks a box, open a WhatsApp deep link with a pre-filled message:
```
Hi! I'd like to lock in this Mystery Box (Rs 3,500):
1. IS1234 — Red dress (size M)
2. IS5678 — Blue top (size M)
... etc.
Box ID: MB-2026-05-06-x7k2
```
The founder confirms availability + creates a draft order in `dollup-admin` manually. Matches the existing "Coming soon — DM to reserve" copy on `/events`.

**Why this scope:** A real Medusa cart at a flat Rs 3,500 needs a backend `cart.adjustment` route (Store API does not allow line-item price overrides). Building that is a separate plan because (a) it requires backend work in `Backend/dollup-medusa/`, (b) it ties up inventory before the founder confirms, and (c) the founder's existing flow is DM-based anyway. **Phase 2 spec is in the "Future" section at the bottom — do NOT implement here.**

---

## File Map

| File | Purpose | Action |
| --- | --- | --- |
| `src/lib/mystery-box.ts` | Pure helpers: `selectRandomBox(pool, count)`, `formatWhatsAppMessage(box)`, types | **Create** |
| `src/lib/mystery-box-client.ts` | Browser-side spin counter (3/day, localStorage, useSyncExternalStore) | **Create** |
| `src/lib/products.ts` | Add `listInStockProductsForSize(size: CanonicalSize, regionId: string)` server helper | **Modify** |
| `src/app/events/mystery-box/page.tsx` | Server shell — fetches the pool, passes to the client component, sets metadata | **Create** |
| `src/app/events/mystery-box/MysteryBoxClient.tsx` | Size picker → wheel → result → lock CTA. The whole interaction. | **Create** |
| `src/app/events/mystery-box/SpinWheel.tsx` | Just the visual wheel (animated strip), driven by props | **Create** |
| `src/app/events/page.tsx` | Replace "DM to reserve" CTA with "Try the wheel →" linking to `/events/mystery-box` | **Modify** |
| `.env.local.example` (or note in PR description) | `NEXT_PUBLIC_WHATSAPP_NUMBER=+230XXXXXXXX` (founder's number) | **Document** |

---

## Task 1: Pure helpers + types

**Files:**
- Create: `src/lib/mystery-box.ts`

Pure functions only — no React, no DOM. Easier to reason about and reusable in Phase 2.

- [ ] **Step 1: Create the file**

```ts
// src/lib/mystery-box.ts

export type CanonicalSize = "XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL" | "4XL" | "FREE";

export type MysteryBoxSlot = {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  size: string;
  thumbnail: string | null;
  price_mur: number; // catalogue price, for "value" copy
};

export type MysteryBox = {
  id: string;          // e.g. "MB-2026-05-06-x7k2"
  size: CanonicalSize;
  slots: MysteryBoxSlot[];
  total_value_mur: number; // sum of slot prices
  flat_price_mur: number;  // 3500
};

export const MYSTERY_BOX_FLAT_PRICE_MUR = 3500;
export const MYSTERY_BOX_SLOT_COUNT = 5;

/** Fisher-Yates shuffle, then take N. Pure, no Math.random side effects beyond the call. */
export function selectRandomBox(
  pool: MysteryBoxSlot[],
  count: number = MYSTERY_BOX_SLOT_COUNT,
): MysteryBoxSlot[] {
  if (pool.length < count) {
    throw new Error(
      `Not enough products in pool: have ${pool.length}, need ${count}`,
    );
  }
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/** Generates a short box id like "MB-2026-05-06-x7k2". Date is local-time ISO date. */
export function generateBoxId(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6);
  return `MB-${y}-${m}-${d}-${rand}`;
}

/** Encodes a WhatsApp deep link. Returns full URL. */
export function buildWhatsAppLockLink(box: MysteryBox, phone: string): string {
  const lines = [
    `Hi! I'd like to lock in this Mystery Box (Rs ${box.flat_price_mur.toLocaleString("en-MU")}):`,
    "",
    ...box.slots.map(
      (s, i) =>
        `${i + 1}. ${s.sku} — ${s.title} (size ${s.size})`,
    ),
    "",
    `Box ID: ${box.id}`,
    `Catalogue value: Rs ${box.total_value_mur.toLocaleString("en-MU")}`,
  ];
  const text = encodeURIComponent(lines.join("\n"));
  // Strip + and any non-digits — wa.me wants raw digits.
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}

/** Sums slot prices. */
export function sumBoxValue(slots: MysteryBoxSlot[]): number {
  return slots.reduce((acc, s) => acc + s.price_mur, 0);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mystery-box.ts
git commit -m "feat(mystery-box): pure helpers — selectRandomBox, buildWhatsAppLockLink"
```

---

## Task 2: Spin counter (3/day) — client-side state

**Files:**
- Create: `src/lib/mystery-box-client.ts`

Mirrors the pattern in `wishlist-client.ts`: `useSyncExternalStore` + `localStorage` + a stable snapshot to avoid React #185 infinite loops.

- [ ] **Step 1: Create the file**

```ts
// src/lib/mystery-box-client.ts
"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "dub_mystery_box_spins";
const DAILY_LIMIT = 3;

type SpinRecord = { date: string; spins: number };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function readRecord(): SpinRecord {
  if (typeof window === "undefined") return { date: todayKey(), spins: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), spins: 0 };
    const parsed = JSON.parse(raw) as SpinRecord;
    if (parsed.date !== todayKey()) return { date: todayKey(), spins: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), spins: 0 };
  }
}

function writeRecord(r: SpinRecord): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  window.dispatchEvent(new CustomEvent("dub:mystery-spin-change"));
}

let cachedSnapshot: SpinRecord | null = null;
let cachedKey = "";

function getSnapshot(): SpinRecord {
  // useSyncExternalStore demands referential stability between calls when
  // the underlying value hasn't changed. Cache by serialized key.
  const r = readRecord();
  const key = `${r.date}:${r.spins}`;
  if (key !== cachedKey) {
    cachedSnapshot = r;
    cachedKey = key;
  }
  return cachedSnapshot!;
}

function getServerSnapshot(): SpinRecord {
  return { date: todayKey(), spins: 0 };
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("dub:mystery-spin-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("dub:mystery-spin-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useSpinCounter(): {
  spinsUsed: number;
  spinsRemaining: number;
  canSpin: boolean;
  recordSpin: () => void;
  reset: () => void;
} {
  const record = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    spinsUsed: record.spins,
    spinsRemaining: Math.max(0, DAILY_LIMIT - record.spins),
    canSpin: record.spins < DAILY_LIMIT,
    recordSpin: () => writeRecord({ date: todayKey(), spins: record.spins + 1 }),
    reset: () => writeRecord({ date: todayKey(), spins: 0 }),
  };
}

export const MYSTERY_BOX_DAILY_LIMIT = DAILY_LIMIT;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/mystery-box-client.ts
git commit -m "feat(mystery-box): client spin counter — 3/day, localStorage, daily reset"
```

---

## Task 3: Add `listInStockProductsForSize` to products.ts

**Files:**
- Modify: `src/lib/products.ts`

Add a server-side helper that fetches in-stock products whose variants include the given canonical size. Uses the existing `medusa.ts` server SDK. Reuses any existing `canonicalSize` normalization (it's already in the codebase per `storefront-polish-session-2026-05-04.md`).

- [ ] **Step 1: Read products.ts to find the existing fetch pattern**

```bash
# Read first to understand the shape of existing helpers
```

- [ ] **Step 2: Add the helper**

Append to `src/lib/products.ts`. The Medusa Store API doesn't have a "filter by variant option value" param, so we fetch a wider page and filter in-process. Cap the pool at 200 products to keep the response light.

```ts
// Below the existing helpers in src/lib/products.ts:

import type { MysteryBoxSlot, CanonicalSize } from "@/lib/mystery-box";
// (If MysteryBoxSlot/CanonicalSize need to live elsewhere to avoid a server→client
// import edge case, move them to a server-friendly module. Plain types are erased,
// so this should be fine — but if tsc complains, split the types into
// `src/lib/mystery-box-types.ts`.)

const POOL_LIMIT = 200;

export async function listInStockProductsForSize(
  size: CanonicalSize,
  regionId: string,
): Promise<MysteryBoxSlot[]> {
  const sdk = serverSdk(); // or whatever the existing function is — match the file's pattern
  const { products } = await sdk.store.product.list({
    region_id: regionId,
    limit: POOL_LIMIT,
    fields: "id,title,thumbnail,variants.id,variants.sku,variants.title,variants.inventory_quantity,variants.calculated_price.calculated_amount,variants.options.value",
  });

  const pool: MysteryBoxSlot[] = [];
  for (const p of products) {
    for (const v of p.variants ?? []) {
      // Variant inventory check — `inventory_quantity` is on managed variants
      const qty = (v as unknown as { inventory_quantity?: number }).inventory_quantity ?? 0;
      if (qty <= 0) continue;
      // Size match — variant.options is an array of { value: "M" } etc.
      const opts = (v as unknown as { options?: { value: string }[] }).options ?? [];
      const sizeOpt = opts.find((o) => canonicalSize(o.value) === size);
      if (!sizeOpt) continue;
      const price = (v as unknown as {
        calculated_price?: { calculated_amount?: number };
      }).calculated_price?.calculated_amount;
      if (typeof price !== "number" || price <= 0) continue;
      pool.push({
        productId: p.id,
        variantId: v.id!,
        sku: v.sku ?? p.id,
        title: p.title ?? "Untitled",
        size,
        thumbnail: p.thumbnail ?? null,
        price_mur: price,
      });
    }
  }
  return pool;
}
```

If `canonicalSize` is not already exported from `products.ts`, look in `src/lib/` for the helper (it's used by `ShopFilterSidebar`; see `storefront-polish-session-2026-05-04.md`) and import it.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

If the cast-soup is rejected, look at what `HttpTypes.StoreProductVariant` actually exposes for `inventory_quantity` / `options` and use the typed access path. Per `CLAUDE.md`: "Real names sometimes differ from doc names".

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts
git commit -m "feat(mystery-box): add listInStockProductsForSize helper"
```

---

## Task 4: SpinWheel visual component

**Files:**
- Create: `src/app/events/mystery-box/SpinWheel.tsx`

A vertical strip of product thumbnails that scrolls fast then decelerates. Driven by props: `pool`, `selected` (the 5 the parent already chose), `spinning`, `onSpinEnd`. Renders 5 columns side-by-side, each a strip.

- [ ] **Step 1: Create SpinWheel.tsx**

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MysteryBoxSlot } from "@/lib/mystery-box";

type Props = {
  /** Background pool the strip cycles through during spin. */
  pool: MysteryBoxSlot[];
  /** The 5 chosen slots — final position when spin stops. */
  selected: MysteryBoxSlot[] | null;
  spinning: boolean;
  onSpinEnd: () => void;
};

const STRIP_TILE_HEIGHT = 96; // px
const STRIP_TILES_PER_COLUMN = 24; // visible window padded with cycle items
const SPIN_DURATION_MS = 2200;

export function SpinWheel({ pool, selected, spinning, onSpinEnd }: Props) {
  const [columns, setColumns] = useState<MysteryBoxSlot[][]>(() =>
    Array.from({ length: 5 }, () => []),
  );
  const calledRef = useRef(false);

  useEffect(() => {
    if (!spinning || !selected) return;
    calledRef.current = false;

    // Build 5 columns: cycle items + the final selected slot at the bottom.
    const next: MysteryBoxSlot[][] = selected.map((finalSlot, colIdx) => {
      const cycle: MysteryBoxSlot[] = [];
      for (let i = 0; i < STRIP_TILES_PER_COLUMN - 1; i++) {
        cycle.push(pool[(colIdx * 7 + i * 3) % pool.length]);
      }
      cycle.push(finalSlot);
      return cycle;
    });
    setColumns(next);

    const t = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onSpinEnd();
      }
    }, SPIN_DURATION_MS + 100);
    return () => clearTimeout(t);
  }, [spinning, selected, pool, onSpinEnd]);

  return (
    <div className="grid grid-cols-5 gap-2 overflow-hidden rounded-2xl bg-ink p-3">
      {columns.map((col, i) => (
        <div
          key={i}
          className="relative h-[96px] overflow-hidden rounded-xl bg-ink/60"
        >
          <div
            className="will-change-transform"
            style={{
              transform: spinning
                ? `translateY(-${(STRIP_TILES_PER_COLUMN - 1) * STRIP_TILE_HEIGHT}px)`
                : "translateY(0)",
              transition: spinning
                ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.8, 0.25, 1)`
                : "none",
            }}
          >
            {col.map((slot, j) => (
              <div
                key={`${i}-${j}-${slot.variantId}`}
                className="flex h-[96px] items-center justify-center"
              >
                {slot.thumbnail ? (
                  <Image
                    src={slot.thumbnail}
                    alt=""
                    width={80}
                    height={80}
                    className="h-[80px] w-[80px] rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-[80px] w-[80px] rounded-lg bg-blush-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/events/mystery-box/SpinWheel.tsx
git commit -m "feat(mystery-box): SpinWheel visual — 5-column animated strip"
```

---

## Task 5: MysteryBoxClient — full interaction

**Files:**
- Create: `src/app/events/mystery-box/MysteryBoxClient.tsx`

The orchestrator. Picks a size → spins → shows result → offers "Lock this box" (WhatsApp) or "Spin again". Honors the 3-spins-per-day limit.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useMemo, useState } from "react";
import { SpinWheel } from "./SpinWheel";
import {
  buildWhatsAppLockLink,
  generateBoxId,
  MYSTERY_BOX_FLAT_PRICE_MUR,
  MYSTERY_BOX_SLOT_COUNT,
  selectRandomBox,
  sumBoxValue,
  type CanonicalSize,
  type MysteryBox,
  type MysteryBoxSlot,
} from "@/lib/mystery-box";
import { useSpinCounter, MYSTERY_BOX_DAILY_LIMIT } from "@/lib/mystery-box-client";

type Props = {
  poolsBySize: Partial<Record<CanonicalSize, MysteryBoxSlot[]>>;
  whatsappNumber: string;
};

const SIZE_OPTIONS: CanonicalSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export function MysteryBoxClient({ poolsBySize, whatsappNumber }: Props) {
  const { spinsUsed, spinsRemaining, canSpin, recordSpin } = useSpinCounter();
  const [size, setSize] = useState<CanonicalSize | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [box, setBox] = useState<MysteryBox | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pool = size ? poolsBySize[size] ?? [] : [];
  const poolReady = pool.length >= MYSTERY_BOX_SLOT_COUNT;

  const lockLink = useMemo(
    () => (box ? buildWhatsAppLockLink(box, whatsappNumber) : null),
    [box, whatsappNumber],
  );

  const startSpin = () => {
    if (!size || !poolReady || !canSpin) return;
    setError(null);
    let slots: MysteryBoxSlot[];
    try {
      slots = selectRandomBox(pool, MYSTERY_BOX_SLOT_COUNT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pick a box");
      return;
    }
    const next: MysteryBox = {
      id: generateBoxId(),
      size,
      slots,
      total_value_mur: sumBoxValue(slots),
      flat_price_mur: MYSTERY_BOX_FLAT_PRICE_MUR,
    };
    setBox(next);
    setSpinning(true);
    recordSpin();
  };

  const handleSpinEnd = () => setSpinning(false);

  return (
    <div className="space-y-8">
      {/* Step 1: Size */}
      <section>
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
          ✦ Step 1
        </p>
        <h2 className="mb-4 font-display text-[24px] leading-tight text-white md:text-[32px]">
          Pick your size
        </h2>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((s) => {
            const available = (poolsBySize[s]?.length ?? 0) >= MYSTERY_BOX_SLOT_COUNT;
            return (
              <button
                key={s}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSize(s);
                  setBox(null);
                  setError(null);
                }}
                className={[
                  "rounded-full border px-5 py-2.5 font-sans text-[12px] font-bold uppercase tracking-[0.12em] transition-colors",
                  size === s
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-white/30 text-white hover:border-coral-300 hover:text-coral-300",
                  !available && "cursor-not-allowed opacity-30",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {s}
              </button>
            );
          })}
        </div>
        {size && !poolReady && (
          <p className="mt-3 font-sans text-[12px] text-coral-300">
            Not enough stock in size {size} right now. Try another size.
          </p>
        )}
      </section>

      {/* Step 2: Wheel */}
      {size && poolReady && (
        <section>
          <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ✦ Step 2
          </p>
          <h2 className="mb-4 font-display text-[24px] leading-tight text-white md:text-[32px]">
            Spin the wheel
          </h2>

          <SpinWheel
            pool={pool}
            selected={box?.slots ?? null}
            spinning={spinning}
            onSpinEnd={handleSpinEnd}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-[12px] text-white/70">
              {spinsRemaining} of {MYSTERY_BOX_DAILY_LIMIT} spins left today
            </p>
            <button
              type="button"
              disabled={spinning || !canSpin}
              onClick={startSpin}
              className="rounded-full bg-coral-500 px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700 disabled:opacity-40"
            >
              {spinning ? "Spinning…" : box ? "Spin again" : "Spin →"}
            </button>
          </div>

          {!canSpin && (
            <p className="mt-2 font-sans text-[12px] text-coral-300">
              You've used all {MYSTERY_BOX_DAILY_LIMIT} spins today. Come back tomorrow.
            </p>
          )}
          {error && (
            <p className="mt-2 font-sans text-[12px] text-coral-300">{error}</p>
          )}
        </section>
      )}

      {/* Step 3: Result */}
      {box && !spinning && (
        <section className="rounded-2xl bg-white/10 p-6 text-white">
          <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
            ✦ Your box
          </p>
          <h2 className="mb-4 font-display text-[24px] leading-tight md:text-[32px]">
            5 surprises · Rs {box.flat_price_mur.toLocaleString("en-MU")}
          </h2>

          <ul className="grid gap-2 md:grid-cols-2">
            {box.slots.map((s, i) => (
              <li
                key={`${s.variantId}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
              >
                <span className="font-display text-[18px] text-coral-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-sans text-[13px] text-white">
                  {s.title}{" "}
                  <span className="text-white/60">— size {s.size}</span>
                </span>
                <span className="font-sans text-[12px] text-white/60">{s.sku}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-sans text-[12px] text-white/70">
            Catalogue value: Rs {box.total_value_mur.toLocaleString("en-MU")} · You pay
            Rs {box.flat_price_mur.toLocaleString("en-MU")}
          </p>

          {lockLink && (
            <a
              href={lockLink}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block rounded-full bg-coral-500 px-7 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
            >
              Lock this box on WhatsApp →
            </a>
          )}
          <p className="mt-2 font-sans text-[11px] text-white/50">
            Box ID: {box.id} · We'll confirm in WhatsApp before payment.
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/events/mystery-box/MysteryBoxClient.tsx
git commit -m "feat(mystery-box): client orchestrator — size pick, spin, lock"
```

---

## Task 6: Server shell page

**Files:**
- Create: `src/app/events/mystery-box/page.tsx`

Server component. Fetches the pool for every supported size in parallel, hands them to the client. Uses the existing region helper.

- [ ] **Step 1: Create the file**

```tsx
import type { Metadata } from "next";
import { getRegion } from "@/lib/region";
import { listInStockProductsForSize } from "@/lib/products";
import type { CanonicalSize, MysteryBoxSlot } from "@/lib/mystery-box";
import { MysteryBoxClient } from "./MysteryBoxClient";

export const metadata: Metadata = {
  title: "Mystery Box · Spin the wheel",
  description:
    "Pick your size, spin our mystery wheel, lock 5 surprise pieces for a flat Rs 3,500.",
  alternates: { canonical: "/events/mystery-box" },
  openGraph: {
    title: "Mystery Box",
    description: "5 surprise pieces · Rs 3,500 · Mauritius only",
    url: "/events/mystery-box",
  },
};

const SIZES: CanonicalSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export const revalidate = 600; // 10 min — pool freshness

export default async function MysteryBoxPage() {
  const region = await getRegion();
  if (!region) {
    return (
      <div className="bg-ink px-6 py-20 text-center text-white">
        <p className="font-sans text-[14px] text-white/70">
          Mystery Box is currently unavailable. Try again later.
        </p>
      </div>
    );
  }

  const pools = await Promise.all(
    SIZES.map(async (s): Promise<[CanonicalSize, MysteryBoxSlot[]]> => {
      try {
        const pool = await listInStockProductsForSize(s, region.id);
        return [s, pool];
      } catch {
        return [s, []];
      }
    }),
  );
  const poolsBySize: Partial<Record<CanonicalSize, MysteryBoxSlot[]>> =
    Object.fromEntries(pools);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

  return (
    <div className="bg-ink min-h-screen px-6 py-14 text-white md:px-10 md:py-20">
      <div className="mx-auto max-w-[1100px]">
        <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-coral-300">
          🎁 Mystery Box
        </p>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-[-1px] md:text-[64px]">
          Spin the wheel.{" "}
          <em className="not-italic text-coral-300" style={{ fontStyle: "italic" }}>
            Trust the drop.
          </em>
        </h1>
        <p className="mt-4 max-w-[560px] font-sans text-[14px] leading-[1.55] text-white/80 md:text-[15px]">
          5 surprise pieces curated for your size. Flat Rs 3,500. Always more value than the price tag.
        </p>

        <div className="mt-10">
          <MysteryBoxClient poolsBySize={poolsBySize} whatsappNumber={whatsapp} />
        </div>

        <p className="mt-12 font-sans text-[11px] text-white/50">
          Free delivery + COD across Mauritius · We'll confirm availability in WhatsApp before payment.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: route `/events/mystery-box` shows up as `ƒ Dynamic` (because `getRegion` may not statically resolve).

- [ ] **Step 3: Commit**

```bash
git add src/app/events/mystery-box/page.tsx
git commit -m "feat(mystery-box): server shell — fetches per-size pools, mounts client"
```

---

## Task 7: Wire the events page CTA

**Files:**
- Modify: `src/app/events/page.tsx`

Replace the "Coming soon — DM to reserve yours" pill with a real "Try the wheel →" link.

- [ ] **Step 1: Update the Mystery Box section's CTA cluster**

Find this block in `src/app/events/page.tsx`:

```tsx
<div className="mt-7 flex flex-wrap gap-3">
  <span className="rounded-full bg-coral-500/20 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-300">
    Coming soon — DM to reserve yours
  </span>
  <a
    href="https://www.instagram.com/dollupboutique/"
    ...
  >
    DM us on Instagram
  </a>
</div>
```

Replace with:

```tsx
<div className="mt-7 flex flex-wrap gap-3">
  <Link
    href="/events/mystery-box"
    className="rounded-full bg-coral-500 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-coral-700"
  >
    Try the wheel →
  </Link>
  <a
    href="https://www.instagram.com/dollupboutique/"
    target="_blank"
    rel="noreferrer"
    className="rounded-full border border-white/30 bg-white/5 px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-ink"
  >
    DM us on Instagram
  </a>
</div>
```

(`Link` is already imported at the top of the file.)

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/events`. Click "Try the wheel →". Land on `/events/mystery-box`.

Full happy-path smoke:
1. Open `/events/mystery-box`. Page header renders.
2. Size buttons appear; sizes with no stock are disabled (lower opacity).
3. Click "M". Wheel section appears.
4. Click "Spin →". Strip animates ~2.2s, ends on the chosen 5 thumbnails.
5. Result section shows 5 line items with title + size + SKU.
6. "Spins left" decrements 3 → 2.
7. Click "Spin again" until counter hits 0. Button disables, "Come back tomorrow" message appears.
8. (Manual reset for testing) DevTools → Application → localStorage → delete `dub_mystery_box_spins`.
9. Click "Lock this box on WhatsApp →". Opens `wa.me/<digits>?text=...` with pre-filled SKUs.
10. Decode the URL — message includes box ID, all 5 SKUs, sizes, catalogue value.

- [ ] **Step 3: Commit + push**

```bash
git add src/app/events/page.tsx
git commit -m "feat(mystery-box): replace events DM placeholder with /events/mystery-box CTA"
git push
```

---

## Final verification checklist

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run build` clean, `/events/mystery-box` in route manifest
- [ ] Browser smoke (above 10-step flow) works end-to-end
- [ ] On mobile width (~375px), wheel + result render without horizontal scroll
- [ ] Disable JavaScript and load `/events/mystery-box` — server-rendered headline + size buttons still appear (degraded but not broken)
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` set in Coolify env (founder's number, e.g. `+230XXXXXXXX`)

---

## Memory entry to save after merge

```
name: Mystery Box wheel shipped (YYYY-MM-DD)
description: /events/mystery-box live, 3 spins/day, WhatsApp lock-in handoff (no automated cart yet)
type: project

Frontend lives at /events/mystery-box. Backend Phase 2 (real Medusa cart at flat Rs 3,500) NOT built — locks go to WhatsApp; founder confirms manually in dollup-admin.

Why: matches existing DM-based flow, ships fast, doesn't tie up inventory.

How to apply: when expanding, see the Phase 2 spec in docs/superpowers/plans/2026-05-06-mystery-box-spin-wheel.md "Future" section.
```

---

## Future — Phase 2 (do NOT implement here)

Backend automation, separate plan + separate session. Spec for the next builder:

**Goal:** Replace the WhatsApp handoff with a real Medusa cart at the flat price.

**Backend (Backend/dollup-medusa):**
- New route `POST /store/mystery-box/create-cart` body `{ slots: [{variant_id, sku}], size, region_id }` → creates a cart, adds the 5 line items at their normal prices, applies a single cart-level adjustment so `cart.total === MYSTERY_BOX_FLAT_PRICE_MUR`, stamps `cart.metadata.mystery_box = { id, size, applied_at }`. Returns the cart id.
- Server-side validation: re-check inventory at request time (frontend pool may be stale). If any slot is out of stock, 409 with the offending variant ids.
- Subscriber on `order.placed` decrements per-customer mystery-box-per-month counter (founder requested no abuse).
- Admin route `GET /admin/mystery-box/orders` lists orders with `metadata.mystery_box` for the founder dashboard.

**Frontend (this codebase):**
- Replace `buildWhatsAppLockLink` call in `MysteryBoxClient` with a fetch to `/store/mystery-box/create-cart`, then `router.push('/checkout?cart=' + cartId)`.
- Checkout already supports rendering `cart.metadata` — display "Mystery Box · {id}" line above totals.
- Keep WhatsApp link as a fallback for stock-conflict errors.

**Why deferred:** Backend module + subscriber takes a full session and the WhatsApp handoff already covers the mechanic. Ship Phase 1, watch how customers use it for 2 weeks, then decide if Phase 2 is worth the maintenance.
