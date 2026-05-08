# Plan 06 — Go-live runbook (T-36h → T-0)

**Owner:** Solo (you)
**Priority:** P0 — the actual launch sequence
**Estimated effort:** 2–3 hours of attention spread over 36h

## Context
Site currently deployed at `shop.dollupboutique.com` with global noindex. Production domain is `dollupboutique.com`. This plan handles the cutover.

## Pre-launch (T-36h to T-2h)

### Step 1 — DNS prep (do early; propagation needs time)
- [ ] Cloudflare → `dollupboutique.com` zone
- [ ] Add CNAME / A record pointing to Coolify front (same target as `shop.dollupboutique.com`)
- [ ] Set TTL to 300 (5min) for the cutover, raise to 3600 after stable
- [ ] Add `dollupboutique.com` and `www.dollupboutique.com` to Coolify domain list for the Next.js app
- [ ] Generate Let's Encrypt certs in Coolify for both
- [ ] Verify both URLs resolve and serve TLS while still showing the noindex'd site

### Step 2 — Backend CORS update
- [ ] Add `https://dollupboutique.com` and `https://www.dollupboutique.com` to Medusa `STORE_CORS` env on Coolify
- [ ] Restart Medusa container
- [ ] Smoke test cart drawer from `dollupboutique.com` — must NOT show "Failed to fetch"

### Step 3 — Update SITE_URL constants in code
- File: `DUB-front/src/app/layout.tsx:25` — `SITE_URL = "https://dollupboutique.com"` (already correct)
- File: `DUB-front/src/app/products/[handle]/page.tsx:14` — same
- File: `DUB-front/src/app/sitemap.ts` — verify uses `https://dollupboutique.com` not staging
- File: `DUB-front/src/app/robots.ts` — must reference final domain
- Grep for `shop.dollupboutique.com` in `src/` — should return only env.local references, not hardcoded

### Step 4 — Set up redirect from staging
- After cutover, `shop.dollupboutique.com` should 301 → `dollupboutique.com`
- Either: Coolify rewrite rule, or Cloudflare Page Rule, or Next.js `redirects()` in `next.config.ts`
- Recommended: Cloudflare Page Rule (simplest, no app deploy needed)

## T-2h — Final pre-launch checks

### Step 5 — Run full build + smoke
- [ ] `npm run build` clean
- [ ] `npm run lint` — review remaining errors (Plan 07 will clean)
- [ ] `npx tsc --noEmit` clean
- [ ] On `shop.dollupboutique.com` (with noindex still on): walk the full happy path:
  - Home → category → PDP → add to cart → checkout → place order with COD
  - Verify order in Medusa admin
  - Verify sheet append (per memory)
  - Verify Coolify backups still running

### Step 6 — Verify Plan 01 Security closed
- [ ] `medusa-admin.ts` deleted
- [ ] No `MEDUSA_ADMIN_*` env vars on frontend Coolify container
- [ ] Medusa admin password rotated, old password retired in 1Password
- [ ] CSP either enforcing or report-only with working `report-uri`

### Step 7 — Verify Plan 05 Analytics live
- [ ] GTM container published with GA4 + Meta Pixel
- [ ] DataLayer events firing (verify with GTM Preview)
- [ ] Consent banner working
- [ ] Test purchase event lands in GA4 DebugView

## T-0 — Cutover

### Step 8 — Flip noindex (CRITICAL)
- File: `DUB-front/src/app/layout.tsx:60`
- Change `robots: { index: false, follow: false, nocache: true }` to `robots: { index: true, follow: true }`
- File: `DUB-front/src/app/robots.ts` — change to:
  ```ts
  export default function robots(): MetadataRoute.Robots {
    return {
      rules: [
        { userAgent: "*", allow: "/", disallow: ["/checkout", "/account", "/api/", "/auth/"] },
      ],
      sitemap: "https://dollupboutique.com/sitemap.xml",
    };
  }
  ```
- Commit + push to `master` → wait for Coolify auto-deploy (~3min)
- **Confirm via curl**: `curl -I https://dollupboutique.com/ | grep -i x-robots` should NOT contain `noindex`.
- View source on home, PDP, shop — `<meta name="robots" content="index,follow">`.

### Step 9 — Submit to search engines
- [ ] Google Search Console: add property `https://dollupboutique.com` (DNS verification preferred)
- [ ] Submit `sitemap.xml`
- [ ] Bing Webmaster Tools: same
- [ ] Test "Inspect URL" on home, a PDP, shop — request indexing for top pages

### Step 10 — Final OG / sharing checks
- [ ] Facebook Sharing Debugger: scrape `https://dollupboutique.com/` — confirm OG image renders
- [ ] LinkedIn Post Inspector: same
- [ ] Twitter Card Validator: same
- [ ] Test by sharing PDP link in WhatsApp/iMessage — preview should show product image + title

### Step 11 — Announce / push
- [ ] Update Instagram bio link
- [ ] TikTok bio
- [ ] Facebook page Website field
- [ ] Pay your team to retweet — kidding, but post the launch on Stories

## T+1h to T+24h — Watch for fires

### Step 12 — Monitor
- [ ] Check Coolify logs every 30 min for first 4h
- [ ] GA4 Real-Time report — confirm traffic flowing, events firing
- [ ] Meta Events Manager — confirm pixel events
- [ ] Medusa admin → Orders — first real orders processing correctly
- [ ] Test forms: track-order, contact, newsletter (if wired)
- [ ] Run Pagespeed Insights on home + PDP, capture scores for baseline

### Step 13 — Rollback plan
- If catastrophic: revert noindex flip commit, push, force re-deploy
- Cloudflare DNS: temporary "site under maintenance" page if needed
- Backend issues: Medusa container restart from Coolify
- Order issues: Medusa admin lets you manually add orders (memory references this pattern)

## T+24h — Stabilize
- [ ] Bump Cloudflare TTL back to 3600
- [ ] Schedule Plan 07 (SEO polish) for week 1
- [ ] Schedule Plan 04 (a11y) for week 1
- [ ] Schedule Plan 03 follow-ups (Header split, sanitize-html migration) for week 2
- [ ] Save the launch in memory for future reference

## Verification checklist (post-cutover)
- [ ] `https://dollupboutique.com/` returns 200, `<meta name="robots" content="index,follow">`
- [ ] `https://dollupboutique.com/sitemap.xml` lists all public routes including products
- [ ] `https://dollupboutique.com/robots.txt` allows `/` and references sitemap
- [ ] `https://shop.dollupboutique.com/` 301-redirects to `dollupboutique.com` (or path-preserving)
- [ ] Cart, checkout, COD order flow works on the new domain
- [ ] Analytics events flow into GA4 + Meta
- [ ] First test order processes end-to-end
