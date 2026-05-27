import { listPreorderStoreProducts } from "./medusa-preorder";

const REGION_ID_MU = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_MU ?? "";

export type PreorderProduct = {
  id: string;
  handle: string;
  title: string;
  thumbnail: string | null;
  variants: Array<{
    id: string;
    calculated_price?: { calculated_amount: number };
  }>;
  metadata?: Record<string, unknown> | null;
};

/**
 * Lists preorder products via the dedicated preorder publishable key, which
 * only has access to the Pre-Order sales channel. Channel-scoped isolation
 * means we no longer need to client-filter on metadata.is_preorder for
 * correctness — but we keep the filter as defense-in-depth (one stray
 * non-preorder product accidentally bound to the channel can't pollute the
 * storefront).
 */
export async function listPreorderProducts(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ products: PreorderProduct[]; count: number }> {
  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;
  const res = await listPreorderStoreProducts({
    limit: 200, // small catalog — page client-side
    offset: 0,
    region_id: REGION_ID_MU,
    fields:
      "id,handle,title,thumbnail,metadata,variants.id,variants.calculated_price",
  }).catch((err) => {
    console.error("Preorder product list failed:", err);
    return null;
  });
  if (!res) return { products: [], count: 0 };
  const allPreorder = res.products.filter(
    (p) =>
      (p.metadata as Record<string, unknown> | null | undefined)
        ?.is_preorder === true,
  );
  const products = allPreorder.slice(
    offset,
    offset + limit,
  ) as unknown as PreorderProduct[];
  return { products, count: allPreorder.length };
}

export async function getPreorderProduct(
  handle: string,
): Promise<PreorderProduct | null> {
  const res = await listPreorderStoreProducts({
    handle,
    limit: 1,
    region_id: REGION_ID_MU,
    fields:
      "id,handle,title,thumbnail,description,metadata,*images,*options,*options.values,*variants,*variants.options,*variants.calculated_price",
  }).catch((err) => {
    console.error("Preorder product lookup failed:", err);
    return null;
  });
  if (!res) return null;
  const p = res.products[0];
  if (!p) return null;
  const meta = (p as { metadata?: Record<string, unknown> | null }).metadata;
  if (!meta || meta.is_preorder !== true) return null;
  return p as unknown as PreorderProduct;
}

/**
 * Splits a pre-order total into deposit + balance, rounding the deposit to the
 * nearest Rs 50 so the customer sees a clean Juice transfer amount. Balance
 * absorbs the rounding delta. Used by PDP and checkout — keep both in sync via
 * this single helper.
 *
 * `totalMur` is in whole MUR rupees (NOT cents). Returns whole MUR rupees too.
 */
export function computeDepositSplit(
  totalMur: number,
  depositPercent = 75,
  roundTo = 50,
): { depositMur: number; balanceMur: number } {
  const rawDeposit = (totalMur * depositPercent) / 100;
  const depositMur = Math.round(rawDeposit / roundTo) * roundTo;
  const balanceMur = totalMur - depositMur;
  return { depositMur, balanceMur };
}

export function computeEtaDates(
  etaMinDays = 15,
  etaMaxDays = 20,
  now: Date = new Date(),
): { earliest: Date; latest: Date } {
  const earliest = new Date(now);
  earliest.setDate(earliest.getDate() + etaMinDays);
  const latest = new Date(now);
  latest.setDate(latest.getDate() + etaMaxDays);
  return { earliest, latest };
}

export function formatEtaRange(d1: Date, d2: Date, locale = "en-GB"): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  return `${fmt.format(d1)} – ${fmt.format(d2)}`;
}
