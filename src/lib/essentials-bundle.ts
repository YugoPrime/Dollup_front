/**
 * Essentials Bundle (Sept 2026) — homepage banner config.
 *
 * The discount itself lives in Medusa as two automatic promotions in campaign
 * `essentials-bundle-2026-09`: ESSENTIALS-BUNDLE (Rs 360 off when all three
 * products are in the cart) + ESSENTIALS-FREESHIP. The campaign ends at the
 * same instant as `endsAt`, so the banner and the discount expire together.
 */
export const essentialsBundle = {
  endsAt: "2026-09-20T23:59:59+04:00", // Mauritius time
  price: 1190,
  compareAt: 1550,
  glueVariantId: "variant_01KQPNE5RQMC18BE3NYPPNHQE0", // IS2382 anti-slip glue
  pantyVariantId: "variant_01KQPNEJ5PX9HM7K5F6WMYHTHM", // IS523 invisible panty
  tapeVariants: [
    { label: "Nude", id: "variant_01KQPN0YQZ8J30EAEV0G0TNG10", swatch: "#E3B9A3" },
    { label: "Black", id: "variant_01KQPN0YQZBZETNGFKF0ANA3T0", swatch: "#1A1212" },
  ],
  contents: ["Adhesive glue", "Boob tape", "2 nipple covers", "Invisible panty"],
} as const;

export function isEssentialsBundleLive(now = Date.now()): boolean {
  return now < new Date(essentialsBundle.endsAt).getTime();
}
