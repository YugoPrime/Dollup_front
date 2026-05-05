# Security, A11y, Performance Handoff

Date: 2026-05-05

## Completed

### Phase 1 - High-impact Security

- `1.1` Added `/api/track-order` per-IP token bucket rate limit: 10 requests/minute, returns `429` with `Retry-After`.
- `1.2` Installed `isomorphic-dompurify` and added shared rich-text sanitizer for:
  - product descriptions / size chart HTML
  - Sales of the Month description
  - About page card HTML
- `1.3` Added local-only redirect validation for login/register and Google auth redirect flow.
- `1.4` Disabled `x-powered-by` and narrowed image remote patterns.
- `1.5` Changed admin cookie `sameSite` to `"strict"`.

### Phase 2 - Security Headers

- Added global `headers()` in `next.config.ts` for:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy-Report-Only`
- CSP is deliberately report-only and permissive for observation before enforcement.

### Phase 3 - A11y Blockers

- `3.1` Removed nested page-level `<main>` tags. Only the root layout keeps `<main id="site-content">`.
- `3.2` Added skip-to-content link as the first child of `<body>`.
- `3.3` Installed `focus-trap-react` and added shared `FocusTrapLayer` for:
  - cart drawer
  - mobile menu
  - mobile filter sheet
- `3.4` Increased mobile tap targets for:
  - product card wishlist heart
  - product card quick add
  - cart quantity `+` / `-`
  - cart remove button
- `3.5` Bumped `--color-ink-muted` from `#8B7373` to `#7A6363`.
- `3.6` Added focus rings for header search inputs and shop sort select.
- `3.7` Added `aria-label` to newsletter and header search inputs.
- `3.8` Added global `prefers-reduced-motion` guard.

### Phase 4 - Performance Polish

- `4.1` Added `revalidate = 60` to `/shop`.
- `4.2` Added loading skeletons for:
  - `/shop`
  - `/products/[handle]`
  - `/wishlist`
  - `/account`
- `4.3` Wrapped home rails/sections in `Suspense` with skeleton fallbacks:
  - Trending
  - Category icons
  - New arrivals
  - Babe essentials
  - Instagram mosaic
- `4.4` Trimmed Playfair font weights to `["400"]`.
- `4.5` Trimmed PDP "you may also like" fetch from 60 products to 12.
- `4.6` Cached CategoryIcons fan-out with `unstable_cache`, 10 minute TTL.

## Verification Done

- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Manual rate-limit probe returned:
  - first 10 `/api/track-order` requests: `404` for invalid test body
  - 11th request from same IP: `429`
- Local production `curl -I` showed all 6 security headers after Phase 2.
- Staging `curl -I https://shop.dollupboutique.com/` did not show new headers at the time of testing, so staging was still on an older deployment.
- Nested-main scan now only finds the root layout `<main>`.

## Remaining From Provided List

- `2.3` Re-verify staging after deployment:
  - `curl -I https://shop.dollupboutique.com/`
  - confirm all 6 security headers are present
  - confirm `x-powered-by` is absent
- Phase 3 acceptance still needs browser/manual validation:
  - keyboard-only tab through the site
  - focus remains trapped in cart drawer, mobile menu, and filter sheet
  - `Escape` closes those overlays
  - focus restores to the opener
  - Lighthouse accessibility score >= 95
- Phase 4 acceptance still needs deployed measurement:
  - Lighthouse performance >= 85 mobile
  - PageSpeed Insights FCP < 1.5s
  - PageSpeed Insights LCP < 2.5s
- `4.7` Blur placeholders were not implemented:
  - generate `blurDataURL` for top hero tiles
  - generate `blurDataURL` for PDP main image
  - recommended next agent decision: choose static precomputed blur values for known assets or runtime/cached generation for remote Medusa images

## Known Caveats

- `npm run lint` still fails on existing React compiler lint rules in unrelated admin/account/search/filter code. Typecheck and build pass.
- `npm install` reported 2 moderate audit findings. No `npm audit fix --force` was run to avoid unrelated dependency churn.
- The working tree already had unrelated pre-existing edits and untracked files before this work; those were not reverted.

