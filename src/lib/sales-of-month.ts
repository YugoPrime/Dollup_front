import { SALE_CAMPAIGN, SALE_PATH } from "./sale-campaign";

export type SalesOfMonthConfig = {
  enabled: boolean;
  headline: string;
  percentOff: number;
  startsAt: string; // ISO timestamp, hidden before
  endsAt: string; // ISO timestamp, hidden after
  ctaUrl: string;
  ctaLabel: string;
  description: string;
};

/**
 * Config for the home page "Sales of the Month" banner. It follows the sale
 * campaign in sale-campaign.ts (name, dates, percent, copy), so it appears
 * when the sale starts and disappears when it ends with no deploy. Set
 * `enabled: false` to hide the section.
 *
 * NOTE: This component only renders the banner. The actual price reduction
 * is the dated sale price list in Medusa admin.
 */
export const salesOfMonthConfig: SalesOfMonthConfig = {
  enabled: true,
  headline: SALE_CAMPAIGN.name,
  percentOff: SALE_CAMPAIGN.maxPercent,
  startsAt: SALE_CAMPAIGN.startsAt,
  endsAt: SALE_CAMPAIGN.endsAt,
  ctaUrl: SALE_PATH,
  ctaLabel: "Shop the sale",
  description: SALE_CAMPAIGN.bannerDescription,
};

/**
 * Splits a banner headline into a plain lead and an italic accent: on the
 * first " of " ("Sales" + "of the Month"), otherwise before the last word
 * ("October" + "Sale"). A single word has no accent.
 */
export function splitHeadline(headline: string): [lead: string, accent: string | null] {
  const of = headline.indexOf(" of ");
  if (of > 0) return [headline.slice(0, of), headline.slice(of + 1)];
  const lastSpace = headline.lastIndexOf(" ");
  if (lastSpace > 0) return [headline.slice(0, lastSpace), headline.slice(lastSpace + 1)];
  return [headline, null];
}
