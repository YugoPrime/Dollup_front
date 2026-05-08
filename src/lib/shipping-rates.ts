import "server-only";
import { getStoreConfig } from "./store-config";

export type ShippingRate = {
  key: string;
  label: string;
  amount: number | null;
  currency: string;
  timeframe: string;
  freeOver?: number;
};

const FALLBACKS: Record<string, { amount: number; freeOver?: number }> = {
  home: { amount: 150 },
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

// Resolve "first wins per key" map from the public store-config shipping options.
// Returns an empty record when no options matched; callers fall through to FALLBACKS.
async function resolveLiveRates(): Promise<Record<string, { amount: number }>> {
  const cfg = await getStoreConfig();
  const out: Record<string, { amount: number }> = {};
  for (const opt of cfg.shipping.options ?? []) {
    const key = matchKey(opt.name ?? "");
    if (!key || out[key]) continue;
    if (opt.amount == null) continue;
    out[key] = { amount: opt.amount };
  }
  return out;
}

export async function getMauritiusRates(): Promise<ShippingRate[]> {
  const [live, cfg] = await Promise.all([resolveLiveRates(), getStoreConfig()]);
  const freeOver = cfg.shipping.free_shipping_threshold_mur;
  return DISPLAY.map((d) => {
    const fallback = FALLBACKS[d.key];
    const liveRow = live[d.key];
    return {
      key: d.key,
      label: d.label,
      timeframe: d.timeframe,
      amount: liveRow?.amount ?? fallback?.amount ?? null,
      currency: "MUR",
      freeOver: d.key === "home" && freeOver > 0 ? freeOver : undefined,
    };
  });
}

export async function getRodriguesRate(): Promise<ShippingRate> {
  const live = await resolveLiveRates();
  const liveRow = live.rodrigues;
  return {
    key: RODRIGUES_DISPLAY.key,
    label: RODRIGUES_DISPLAY.label,
    timeframe: RODRIGUES_DISPLAY.timeframe,
    amount: liveRow?.amount ?? FALLBACKS.rodrigues.amount,
    currency: "MUR",
  };
}
