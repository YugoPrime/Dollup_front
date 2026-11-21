// The current sale campaign, in one place. The /sale page, the homepage
// banner (sales-of-month.ts), the promo bar above the header and the "Sale"
// links in nav.ts all read this file, so the next sale only edits the values
// in SALE_CAMPAIGN below.
//
// The prices themselves come from dated Medusa price lists the owner applies
// separately. This file only drives what the site says, and when. Keep
// startsAt/endsAt equal to the price list's dates, or the site advertises a
// sale Medusa isn't pricing. The same goes for `peak`: it mirrors the second,
// one-day price list (Medusa charges the lower price while both run).
//
// Client-safe (no server-only imports): the promo bar and the banner check
// the window in the browser.
import { freePostageActive, muDateParts } from "./checkout";

/** Shown at the end of the promo bar on desktop, as on the advent bar. */
const COD = "Cash on delivery available";

export const SALE_CAMPAIGN = {
  name: "Black Friday",
  headline: "Up to 50% off",
  /** Deepest tier in the price list, for "up to X%" copy. */
  maxPercent: 50,
  // Mauritius time (+04:00). The end second is included: still on at 23:59:59.
  startsAt: "2026-11-23T00:00:00+04:00",
  endsAt: "2026-11-29T23:59:59+04:00",
  /** Homepage banner copy. HTML, sanitised before render. */
  bannerDescription:
    "Up to 50% off more than 300 pieces: dresses, swimwear, lingerie &amp; essentials. Friday 27 Nov only: prices drop again. Ends Sunday 29 Nov.",
  /** Search and social description for /sale. */
  description:
    "Black Friday at Doll Up: up to 50% off more than 300 dresses, swimwear, lingerie and essentials, and prices drop again on Friday 27 Nov. 23–29 Nov, Mauritius only.",
  /**
   * One day inside the sale with deeper prices: a second Medusa price list,
   * Fri 27 Nov. Most pieces are another 10% lower that day.
   */
  peak: {
    startsAt: "2026-11-27T00:00:00+04:00",
    endsAt: "2026-11-27T23:59:59+04:00",
    /** /sale hero line and homepage banner kicker. */
    label: "Today only: prices drop again",
    /** Homepage banner copy on the day. HTML, sanitised before render. */
    bannerDescription:
      "Today only, most pieces are another 10% lower than this week: up to 50% off dresses, swimwear, lingerie &amp; essentials. Ends tonight at midnight.",
    /** Coral promo bar lead on the day. */
    barLead: "Black Friday · today only, prices drop again →",
    /** /sale hero line before the day. */
    teaser: "Friday 27 Nov: prices drop again",
  },
  /**
   * Pinned to the top of /sale in this order (the carousel-ad cards). Any
   * that are sold out or not on sale are skipped.
   */
  featuredHandles: [
    "is2281", "is2364", "is2297", "is2340", "is2358",
    "is2342", "is2292", "is1977", "is2446", "is2337",
  ],
  /**
   * Category order within a discount tier on /sale, by category handle. A
   * product unlisted here ranks as its nearest listed parent (Pajamas as
   * Lingerie); anything with no listed parent (Plus Size, After Dark) comes
   * after every group.
   */
  categoryOrder: [
    ["dresses"],
    ["two-piece-outfits"],
    ["jumpsuits"],
    ["bikini-sets", "one-pieces", "cover-ups", "beachwear"],
    ["sweaters-&-cardigans", "hoodies", "winter"],
    ["tops", "tank-tops-&-camis", "skirts", "pants", "bottoms"],
    ["accessories", "bags", "shoes", "jewelry"],
    ["lingerie", "bodysuits"],
    ["essentials"],
  ],
} as const;

/** The campaign landing page (src/app/sale). */
export const SALE_PATH = "/sale";

export type SalePhase = "upcoming" | "active" | "ended";

type SaleWindow = { startsAt: string; endsAt: string };

/**
 * Where `now` falls in the sale window. startsAt/endsAt carry their own
 * offset, so this compares absolute instants and the server's or viewer's
 * timezone never matters.
 */
export function salePhase(
  now: Date | number = Date.now(),
  window: SaleWindow = SALE_CAMPAIGN,
): SalePhase {
  const t = typeof now === "number" ? now : now.getTime();
  if (t < Date.parse(window.startsAt)) return "upcoming";
  if (t > Date.parse(window.endsAt)) return "ended";
  return "active";
}

export function isSaleActive(now?: Date | number): boolean {
  return salePhase(now) === "active";
}

export function hasSaleEnded(now?: Date | number): boolean {
  return salePhase(now) === "ended";
}

/** Where `now` falls in the one-day deeper-price window (SALE_CAMPAIGN.peak). */
export function salePeakPhase(now: Date | number = Date.now()): SalePhase {
  return salePhase(now, SALE_CAMPAIGN.peak);
}

export function isSalePeak(now?: Date | number): boolean {
  return salePeakPhase(now) === "active";
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "Monday 19 October": the Mauritius calendar day of an ISO timestamp.
 * Built from muDateParts, never toISOString or toLocale*, which follow the
 * server's or viewer's timezone and can land a day off.
 */
export function muLongDate(iso: string): string {
  const { day, month, dow } = muDateParts(new Date(iso));
  return `${WEEKDAYS[dow]} ${day} ${MONTHS[month]}`;
}

/** "1 Nov" */
export function muShortDate(iso: string): string {
  const { day, month } = muDateParts(new Date(iso));
  return `${day} ${MONTHS[month].slice(0, 3)}`;
}

export const SALE_STARTS_LABEL = muLongDate(SALE_CAMPAIGN.startsAt);
export const SALE_ENDS_LABEL = muLongDate(SALE_CAMPAIGN.endsAt);
export const SALE_ENDS_SHORT_LABEL = muShortDate(SALE_CAMPAIGN.endsAt);

/**
 * What the coral bar above the header leads with. The sale and the free
 * postage offer (checkout.ts) have separate end dates, so a sale without
 * free postage never claims it.
 */
export type PromoBarState =
  | "sale-free-postage"
  | "sale"
  | "free-postage"
  | "evergreen";

export function promoBarState(now: Date = new Date()): PromoBarState {
  const postage = freePostageActive(now);
  if (isSaleActive(now)) return postage ? "sale-free-postage" : "sale";
  return postage ? "free-postage" : "evergreen";
}

export type SaleBarCopy = { lead: string; href: string; tail: string | null };

/**
 * The coral bar's line while the sale runs, or null outside it (the advent
 * calendar's bar takes over). The tail, desktop only, points at what comes
 * next: Friday's deeper prices, then the last day.
 */
export function saleBarCopy(now: Date | number = Date.now()): SaleBarCopy | null {
  if (!isSaleActive(now)) return null;
  const peak = salePeakPhase(now);
  if (peak === "active") return { lead: SALE_CAMPAIGN.peak.barLead, href: SALE_PATH, tail: COD };
  return {
    lead: `${SALE_CAMPAIGN.name} · ${SALE_CAMPAIGN.headline.toLowerCase()} →`,
    href: SALE_PATH,
    tail: peak === "upcoming" ? SALE_CAMPAIGN.peak.teaser : `Ends ${SALE_ENDS_LABEL}`,
  };
}
