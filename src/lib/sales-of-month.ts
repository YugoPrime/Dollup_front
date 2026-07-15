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
  headline: "8 Years of Doll Up 🎂 Anniversary Sale",
  percentOff: 50, // "up to 50%" — clearance tier; heroes 30%, movers 35%
  endsAt: "2026-07-31T23:59:59+04:00", // Mauritius timezone
  ctaUrl: "/events/anniversary",
  ctaLabel: "Shop the anniversary sale",
  description: "8 years, thank you! Up to 50% off dresses, lingerie &amp; essentials — plus a free gift, bundles &amp; a Rs 2,000 prize draw. Toys excluded.",
};
