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
 * Future: move to Medusa metadata or env vars.
 */
export const salesOfMonthConfig: SalesOfMonthConfig = {
  enabled: false,
  headline: "Sale of the month",
  percentOff: 50,
  endsAt: "2026-05-10T23:59:59+04:00", // Mauritius timezone
  ctaUrl: "/shop?sort=sale",
  ctaLabel: "Shop the sale",
  description: "Selected dresses, bikinis &amp; lingerie. Once it's gone, it's gone.",
};
