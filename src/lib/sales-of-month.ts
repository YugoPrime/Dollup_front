export type SalesOfMonthConfig = {
  enabled: boolean;
  headline: string;
  percentOff: number;
  endsAt: string; // ISO timestamp
  ctaUrl: string;
  ctaLabel: string;
  description: string;
};

/**
 * Hand-edited config for the home page "Sales of the Month" banner.
 * Edit and redeploy to update the sale. Set `enabled: false` to hide the section.
 *
 * NOTE: This component only renders the banner. The actual price reduction
 * must be configured in Medusa admin (price list applied to winter-tagged products).
 */
export const salesOfMonthConfig: SalesOfMonthConfig = {
  enabled: true,
  headline: "Winter outfit sale",
  percentOff: 10,
  endsAt: "2026-06-03T23:59:59+04:00", // Mauritius timezone — 1 month from launch
  ctaUrl: "/shop?tag=winter",
  ctaLabel: "Shop winter outfits",
  description: "Stay cozy &amp; cute. 10% off every winter piece — sweaters, hoodies, knitwear &amp; more.",
};
