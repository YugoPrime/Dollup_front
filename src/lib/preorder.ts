import { listStoreProducts } from "./medusa";

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

export async function listPreorderProducts(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ products: PreorderProduct[]; count: number }> {
  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;
  const res = await listStoreProducts({
    limit: 200, // fetch wider, filter client-side because store API metadata equality filtering is unreliable
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
  const res = await listStoreProducts({
    handle,
    limit: 1,
    region_id: REGION_ID_MU,
    fields:
      "id,handle,title,thumbnail,description,images.*,options.*,metadata,variants.*,variants.calculated_price",
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
