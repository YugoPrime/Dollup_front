# Mobile PDP Hero — Responsive Height Fix

**Date:** 2026-05-25
**Scope:** `DUB-front/src/components/product/MobilePdpHero.tsx`
**Status:** Approved, ready for plan

## Problem

A client reported that on her phone, the size selector pill is not visible on the mobile PDP. Screenshot confirms: the floating ADD TO BAG bar sits directly on top of where the size pill should be, and the size pill is nowhere on screen.

The bug only appears on certain phones (taller-narrower aspect ratios) and inside in-app browsers (Facebook, Instagram) where browser chrome eats more vertical space.

## Root cause

`MobilePdpHero` renders the hero with `style={{ aspectRatio: "4 / 5" }}`. The hero height is therefore a pure function of viewport **width**, not viewport height:

- On a 412×915 phone: hero = 412 × 5/4 = **515px tall**
- On a 360×780 phone in the FB in-app browser (chrome ~140px): usable viewport = 640px, hero = **450px tall**, leaves only **190px** under the hero for everything else
- The fixed ADD TO BAG bar sits at `bottom-[72px]` (above the bottom-nav h-[72px]) and is ~64px tall, so it occupies the bottom **136px of the viewport**
- The size pill is positioned `absolute bottom-3` **inside** the hero, i.e. ~12px from the hero's own bottom edge
- When the hero's bottom edge falls inside the bottom 136px region, the ADD TO BAG bar visually covers the size pill — exactly what the client saw

This is a layout collision between an absolutely-positioned-inside-hero element (size pill) and a `position: fixed` overlay (ADD TO BAG). The hero's height does not know about the CTA, so it can always be tall enough to push the pill behind it on short viewports.

## Design

Replace the static aspect ratio with a viewport-height-driven hero that always leaves room for the CTA bar.

### Change 1 — Hero sizing

[src/components/product/MobilePdpHero.tsx](src/components/product/MobilePdpHero.tsx) line 312:

**Before**
```tsx
<div className="relative w-full overflow-hidden bg-blush-100" style={{ aspectRatio: "4 / 5" }}>
```

**After**
```tsx
<div
  className="relative w-full overflow-hidden bg-blush-100"
  style={{ height: "62dvh", minHeight: 480, maxHeight: 620 }}
>
```

Why each value:
- `62dvh` — dynamic viewport height. Recomputes when the URL bar collapses/expands, so the hero doesn't jump. 62% leaves ~38% (≈ 300px on a 780px viewport) for the CTA bar (~64px), bottom nav (~72px), and a peek of the description below — encouraging scroll.
- `minHeight: 480` — guards against absurdly squat heroes on landscape or foldable-unfolded views. 480px is the minimum height where the title overlay (`bottom-[140px]`) + color row (`bottom-[84px]`) + size pill (`bottom-3`) still stack cleanly without overlapping each other.
- `maxHeight: 620` — guards against giant heroes on tablets in portrait that briefly hit the md breakpoint or on very tall phones. Keeps the page from feeling like a one-image kiosk on tall devices.

### Change 2 — Image cover behavior

No code change needed. The children already use `object-cover object-top` on `<Image fill>`, which fills any container size correctly. The crop will tighten slightly on wide-short viewports, which is acceptable for fashion shots (model's face/torso stays in frame because of `object-top`).

### Change 3 — Verification

Manual smoke on Chrome DevTools device emulation, all on a PDP with size variants (e.g. IS2346 from the screenshot):

| Device                         | Hero height | Size pill visible? | CTA overlap? |
|--------------------------------|-------------|--------------------|--------------|
| iPhone SE (375×667)            | 480 (clamp) | yes                | no           |
| iPhone 15 (393×852)            | 528         | yes                | no           |
| Pixel 7 (412×915)              | 567         | yes                | no           |
| Galaxy S20 Ultra (412×915)     | 567         | yes                | no           |
| Galaxy Z Fold unfolded (768×~) | 620 (clamp) | yes                | no           |
| iPad Mini portrait (768×1024)  | n/a — md breakpoint hits, desktop layout | n/a | n/a |
| FB in-app browser sim (360×640)| 480 (clamp) | yes                | no           |

For each device: confirm in DevTools (1) the size pill renders fully above the ADD TO BAG bar, (2) the title and color row do not overlap the size pill, (3) the page-indicator dots at `top-16` still align with image content.

## Non-goals

- Not redesigning the hero composition (title position, color thumbs, SKU pill, heart all stay where they are).
- Not changing the ADD TO BAG bar position or styling.
- Not touching the desktop PDP layout (the change is gated by `md:hidden` on the wrapper).
- Not changing the size-pill's internal layout — only the container height.
- No dvh fallback for very old browsers — Safari 15.4+, Chrome 108+ cover ≥97% of MU mobile traffic; Tailwind/Next ship a CSS pipeline that doesn't polyfill this and we don't want to.

## Files touched

- `src/components/product/MobilePdpHero.tsx` — 1 line edited (the hero `<div>` style attr)

## Risk

Very low. Single-line style change, scoped to `md:hidden`, no logic change, no API change. Worst case: the hero looks slightly shorter than today on some phones — easily reverted.
