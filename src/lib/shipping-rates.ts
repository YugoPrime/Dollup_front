import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminSdk } from "./medusa-admin";

export type ShippingRate = {
  key: string;
  label: string;
  amount: number | null;
  currency: string;
  timeframe: string;
  freeOver?: number;
};

const FALLBACKS: Record<string, { amount: number; freeOver?: number }> = {
  home: { amount: 150, freeOver: 1500 },
  postRegular: { amount: 70 },
  postExpress: { amount: 110 },
  pickup: { amount: 0 },
  rodrigues: { amount: 100 },
};

const DISPLAY = [
  { key: "home", label: "Home / office delivery", timeframe: "Next day if ordered before 2pm" },
  { key: "postRegular", label: "Mauritius Post (regular)", timeframe: "2–4 working days" },
  { key: "postExpress", label: "Mauritius Post (express)", timeframe: "1–2 working days" },
  { key: "pickup", label: "Pickup at Pereybere", timeframe: "When ready — we'll WhatsApp you" },
] as const;

const RODRIGUES_DISPLAY = {
  key: "rodrigues",
  label: "Mauritius Post",
  timeframe: "Approx. 2 weeks",
};

function matchKey(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("rodrigues")) return "rodrigues";
  if (n.includes("pickup") || n.includes("pick up") || n.includes("pereybere")) return "pickup";
  if (n.includes("express")) return "postExpress";
  if (n.includes("post")) return "postRegular";
  if (n.includes("home") || n.includes("office") || n.includes("delivery") || n.includes("courier")) return "home";
  return null;
}

const fetchRatesFromMedusa = unstable_cache(
  async (): Promise<Record<string, { amount: number; currency: string }> | null> => {
    try {
      const sdk = await getAdminSdk();
      const { shipping_options } = await sdk.admin.shippingOption.list({
        fields: "id,name,prices.amount,prices.currency_code",
        limit: 100,
      });
      const out: Record<string, { amount: number; currency: string }> = {};
      for (const opt of shipping_options ?? []) {
        const key = matchKey(opt.name ?? "");
        if (!key || out[key]) continue;
        const price =
          opt.prices?.find((p) => p.currency_code?.toLowerCase() === "mur") ??
          opt.prices?.[0];
        if (price?.amount == null) continue;
        out[key] = { amount: price.amount, currency: price.currency_code ?? "MUR" };
      }
      return out;
    } catch (err) {
      console.error("[shipping-rates] failed to fetch from Medusa", err);
      return null;
    }
  },
  ["shipping-rates-v1"],
  { revalidate: 300, tags: ["shipping-rates"] },
);

export async function getMauritiusRates(): Promise<ShippingRate[]> {
  const live = await fetchRatesFromMedusa();
  return DISPLAY.map((d) => {
    const fallback = FALLBACKS[d.key];
    const liveRow = live?.[d.key];
    return {
      key: d.key,
      label: d.label,
      timeframe: d.timeframe,
      amount: liveRow?.amount ?? fallback?.amount ?? null,
      currency: liveRow?.currency ?? "MUR",
      freeOver: fallback?.freeOver,
    };
  });
}

export async function getRodriguesRate(): Promise<ShippingRate> {
  const live = await fetchRatesFromMedusa();
  const liveRow = live?.rodrigues;
  return {
    key: RODRIGUES_DISPLAY.key,
    label: RODRIGUES_DISPLAY.label,
    timeframe: RODRIGUES_DISPLAY.timeframe,
    amount: liveRow?.amount ?? FALLBACKS.rodrigues.amount,
    currency: liveRow?.currency ?? "MUR",
  };
}
