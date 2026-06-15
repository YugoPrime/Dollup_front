# Doll Up Boutique — New Collection Marketing Pack (June 2026)

Brand voice anchor (from live storefront): **"Doll up, babe."** / *"Find your next favorite fit."*
Palette: coral (`coral-500 #E5604A`) on cream, Playfair display + DM Sans. Tone: warm, playful,
confident, island-girl. Market: Mauritius, EN/FR. Always: **COD + fast island-wide delivery**,
**DM or comment to order**, WhatsApp-first.

Drop in focus: the 2026-06-14 collection (refs **IS2429–IS2448**, ~20 styles — dresses, After Dark,
beachwear). All product links: `https://dollupboutique.com/products/<is####>`.

---

## 1) Hero concept — "Fresh Drop" (homepage)

> Concept only — not yet built. Current hero is `src/components/home/HeroBento.tsx` (bento product
> mosaic, headline *"Doll up, babe."*). This keeps that frame and brand style; swap in a seasonal
> eyebrow + dynamic newest-product mosaic so every drop refreshes the hero with **no per-launch edit**
> (mirrors the recency fix in `9c09a7a`).

**Layout** — keep the existing 2-column bento (`md:grid-cols-[1fr_1.4fr]`), coral accents, ✦ mark.
- **Eyebrow** (replaces "Find your next favorite fit." for drop weeks):
  `JUST DROPPED · 20 NEW STYLES`
- **Headline** (keep the signature):
  Doll up, *babe.*
- **Sub** (rotates per season):
  `The June drop is here — dresses, After Dark & beachwear, fresh off the rail.`
  `Island-wide delivery. Cash on delivery. DM to order anytime.`
- **Primary CTA:** `Shop the new drop →` → `/shop?sort=new`
- **Secondary CTA:** `Browse sale` → `/shop?on_sale=1`
- **Mosaic:** newest 4–5 by `created_at` (already what `listFeatured` returns post-fix). Add a small
  coral `NEW` ribbon on the top-left tile to echo the ProductCard badge.

**Image direction** (if shooting/selecting a hero still): one editorial wide shot — model mid-laugh,
natural island light, coral prop or backdrop, soft cream tones. No heavy filters. Frame at full
opacity from frame 0 (matches the stories no-fade rule).

**Optional A/B on eyebrow:** A `JUST DROPPED · 20 NEW STYLES` vs B `NEW THIS WEEK · SHOP THE DROP`.

*Want this implemented? It's a small, low-risk edit to `HeroBento.tsx` (eyebrow + CTA copy + NEW
ribbon) — say the word and I'll do it behind the existing layout.*

---

## 2) Facebook / Instagram creative — New Collection

Objective: **Messages** (Messenger + IG), Mauritius women 18–40, EN/FR. Mirrors
`winter-sale-meta-ads.csv` setup. Limits noted for Ads Manager.

### Primary text variants (≤125 chars before "see more")

**A — Drop announcement**
> New drop just landed, babe 🌸 20 fresh styles — dresses, After Dark & beachwear. DM to order, COD island-wide. 🚚

**B — Scarcity / FOMO**
> The new collection is moving fast ✨ Sizes go quick. Comment "MINE" or DM us to lock yours. Delivered to your door, pay on delivery.

**C — Benefit-led**
> Trendy fits, Mauritius prices, zero stress 💕 Shop the June drop → DM to order, cash on delivery, fast island-wide delivery.

**D — French**
> Nouvelle collection arrivée 🌸 20 nouveaux looks — robes, lingerie & plage. Écris-nous en DM pour commander. Paiement à la livraison partout à Maurice 🚚

**E — Conversational**
> Okay this drop is *so* good 😍 We just added 20 new pieces. Slide into our DMs and we'll help you style it. COD, delivered island-wide.

### Headlines (≤40 chars)
- `New Drop — Shop It First`
- `20 New Styles Just In`
- `DM to Order · COD Island-Wide`
- `Nouvelle Collection 🌸`
- `Your Next Favourite Fit`

### Descriptions (≤30 chars, link/news-feed)
- `Cash on delivery · MU`
- `DM to order anytime`
- `Fast island-wide delivery`

### CTA button
`Send Message` (Messages objective) — or `Shop Now` → `/shop?sort=new` for a traffic variant.

### Creative notes
- Carousel: lead with the strongest 3–5 styles from IS2429–IS2448, front shot first.
- Overlay text minimal (Meta penalises heavy text); let the product carry it.
- First frame must read in 1.5s on mute: product + price + "DM to order".

---

## 3) Website / traffic ads (Shop Now → storefront)

For a **Traffic / Sales** objective driving to `dollupboutique.com` (not Messages).

**Primary text**
> A1 — Shop the new June collection at Doll Up Boutique 🌸 Dresses, After Dark & beachwear, delivered across Mauritius. Cash on delivery, no card needed.
>
> A2 — Mauritius' favourite women's boutique just dropped 20 new styles. Browse the full collection online → cash on delivery, fast island-wide delivery.

**Headlines**
- `Shop the New Collection`
- `New In — Doll Up Boutique`
- `Dresses, Lingerie & Beachwear`

**Descriptions**
- `Cash on delivery across Mauritius`
- `Free standard delivery island-wide`

**CTA:** `Shop Now` → `https://dollupboutique.com/shop?sort=new`

---

## 4) WhatsApp Status — New Toys Stock

For the toys line (see `Toys Newsletters/`). WhatsApp Status / broadcast copy.

**Status slide (short, on-image text)**
> 🧸 NEW TOYS IN STOCK
> DM to order 📲
> Delivered island-wide · COD

**Broadcast / caption version**
> 🧸✨ New toys just landed! Fresh stock in now — perfect gifts, limited quantities.
> 📲 DM to order
> 🚚 Cash on delivery, delivered across Mauritius
> Reply here and we'll send you the list 💛

**French**
> 🧸 Nouveaux jouets en stock ! Quantités limitées.
> 📲 Écris-nous pour commander · Paiement à la livraison partout à Maurice 🚚

---

## Reuse / consistency checklist
- Price shown as `Rs X,XXX` (matches feed-post + storefront formatting).
- Every product post/ad includes: **price · DM-to-order · COD · island-wide delivery**.
- Product ref format `IS####` (uppercase) — same as the daily feed-post caption.
- Don't invent new palette colours; coral + cream only.
