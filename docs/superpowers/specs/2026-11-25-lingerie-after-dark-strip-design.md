# Lingerie product pages point to After Dark

**Date:** 2026-11-25 · **Approved by Rahvi in chat** ("Yes", build after PR #16 merges).

## Why
Rahvi wants shoppers browsing lingerie to discover After Dark. The lingerie *category* page already has the "Feeling bold? Spice up your love life — explore After Dark" banner (now linking `/after-dark`, PR #16). Lingerie *product* pages had nothing.

## What
- A slim strip on every product page whose categories include the handle `lingerie`.
- Copy: small uppercase eyebrow "Feeling bold?", then "Explore After Dark", then an arrow. Same coral → ink gradient as the category banner.
- Links to `AFTER_DARK_PATH` (`/after-dark`), where the 18+ check shows.
- **Desktop:** directly under the buy box (`ProductBuy`), above the description accordion.
- **Mobile:** right after `MobilePdpHero` (its Add to bag is a sticky bottom bar), before related products.

## Not
- No change to the category banner, toy pages, or other categories.
- No new colours: existing tokens only.

## Approaches
1. **Strip on the product page (chosen):** one small server component, placed twice (desktop / mobile).
2. Inside `ProductBuy` / `MobilePdpHero`: rejected, because those are client components shared by every product, and it widens the change.
3. Shared component also used by the shop banner: rejected for now, because it refactors a working banner with no request for it.
