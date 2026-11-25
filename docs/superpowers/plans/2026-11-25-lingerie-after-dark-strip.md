# Lingerie → After Dark Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lingerie product pages show a "Feeling bold? Explore After Dark" strip linking `/after-dark`.

**Architecture:** A pure helper decides which products qualify; a small server component renders the strip; the product page places it under the desktop buy box and after the mobile hero.

**Tech Stack:** Next.js 16 App Router (server components), Tailwind v4 tokens, vitest for the pure helper.

**Spec:** `docs/superpowers/specs/2026-11-25-lingerie-after-dark-strip-design.md`

## Global Constraints
- Link target: `AFTER_DARK_PATH` from `src/lib/after-dark.ts` (do not hard-code `/after-dark`, do not edit that file).
- Copy exactly: eyebrow "Feeling bold?", line "Explore After Dark".
- Colours: existing tokens only, same gradient as the shop banner (`from-coral-500 via-coral-700 to-ink`).
- Ship from a branch off `origin/master` (local master is diverged).

## Review Focus
- Product with `categories` null/undefined/empty → no strip (test in Task 1).
- Product in lingerie plus another category (lingerie not first) → strip shows (test in Task 1).
- Category handle with different case or trailing slash ("Lingerie", "lingerie/") → strip shows (test in Task 1).
- Toy / After Dark products → never reach this branch (the page returns `ToyProductPage` earlier); nothing to add.
- Mobile: strip must not sit under the sticky Add to bag bar at page end → it is placed before related products, not at the very bottom (checked in Task 2 smoke).

---

### Task 1: Which products get the strip

**Files:**
- Create: `src/lib/lingerie-teaser.ts`
- Test: `src/lib/lingerie-teaser.test.ts`

**Interfaces:**
- Produces: `isLingerieProduct(categories: ReadonlyArray<{ handle?: string | null }> | null | undefined): boolean`

- [ ] **Step 1: Write the failing test** (vitest, same style as `products-order.test.ts`)

```ts
expect(isLingerieProduct([{ handle: "lingerie" }])).toBe(true)
expect(isLingerieProduct([{ handle: "dresses" }, { handle: "lingerie" }])).toBe(true)
expect(isLingerieProduct([{ handle: "Lingerie/" }])).toBe(true)
expect(isLingerieProduct([{ handle: "dresses" }])).toBe(false)
expect(isLingerieProduct([])).toBe(false)
expect(isLingerieProduct(null)).toBe(false)
expect(isLingerieProduct(undefined)).toBe(false)
expect(isLingerieProduct([{ handle: null }])).toBe(false)
```

- [ ] **Step 2: Run it, expect FAIL** (module not found). Run from a `npm ci` export of the worktree (Turbopack/vitest junction trap): `npx vitest run src/lib/lingerie-teaser.test.ts`
- [ ] **Step 3: Implement** `isLingerieProduct`: trim trailing slashes, lowercase, compare with `"lingerie"`.
- [ ] **Step 4: Run it, expect PASS.**
- [ ] **Step 5: Commit** `feat(pdp): which products point to After Dark`

### Task 2: The strip on the product page

**Files:**
- Create: `src/components/product/AfterDarkStrip.tsx` (server component, no `"use client"`)
- Modify: `src/app/products/[handle]/page.tsx` (non-toy branch: after `<MobilePdpHero …/>` wrapped `md:hidden`, and between `<ProductBuy …/>` and the `mt-6` accordion block)

**Interfaces:**
- Consumes: `isLingerieProduct` (Task 1), `AFTER_DARK_PATH`
- Produces: `AfterDarkStrip({ className }: { className?: string })`

- [ ] **Step 1: Implement `AfterDarkStrip`**: a `next/link` to `AFTER_DARK_PATH`, rounded, gradient as Global Constraints, eyebrow + line + `ArrowRight` (lucide), visible focus ring.
- [ ] **Step 2: Place it** where `isLingerieProduct(product.categories)` is true, in both spots.
- [ ] **Step 3: Verify** in the export: `npx tsc --noEmit` clean; `npx next build` shows the route table (exit code alone is not proof).
- [ ] **Step 4: Smoke** with `next start` against prod data (GET only): a lingerie PDP shows one strip on desktop width and one on phone width, linking `/after-dark`; a dress PDP and a toy PDP show none.
- [ ] **Step 5: Commit** `feat(pdp): lingerie product pages point to After Dark`
