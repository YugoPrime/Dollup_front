// The current sale campaign, in one place. The /sale page, the homepage
// banner (sales-of-month.ts), the promo bar above the header and the "Sale"
// links in nav.ts all read this file, so the next sale only edits the values
// in SALE_CAMPAIGN below.
//
// The prices themselves come from a dated Medusa price list the owner applies
// separately. This file only drives what the site says, and when. Keep
// startsAt/endsAt equal to the price list's dates, or the site advertises a
// sale Medusa isn't pricing.
//
// Client-safe (no server-only imports): the promo bar and the banner check
// the window in the browser.
import { freePostageActive, muDateParts } from "./checkout";

export const SALE_CAMPAIGN = {
  name: "October Sale",
  headline: "Up to 50% off + free postage",
  /** Deepest tier in the price list, for "up to X%" copy. */
  maxPercent: 50,
  // Mauritius time (+04:00). The end second is included: still on at 23:59:59.
  startsAt: "2026-10-19T00:00:00+04:00",
  endsAt: "2026-11-01T23:59:59+04:00",
  /** Homepage banner copy. HTML, sanitised before render. */
  bannerDescription:
    "Up to 50% off dresses, swimwear, lingerie &amp; essentials + free postage on every order. Ends Sunday 1 Nov.",
  /** Search and social description for /sale. */
  description:
    "Up to 50% off dresses, swimwear, lingerie and essentials, plus free postage on every order. 19 Oct – 1 Nov, Mauritius only.",
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
