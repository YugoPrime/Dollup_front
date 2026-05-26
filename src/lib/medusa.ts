import Medusa from "@medusajs/js-sdk";

const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const PRODUCT_LIST_TIMEOUT_MS = 15_000;

if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL");
if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

export const sdk = new Medusa({
  baseUrl,
  publishableKey,
});

export const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "mu";

type StoreProductListQuery = NonNullable<
  Parameters<typeof sdk.store.product.list>[0]
>;
type StoreProductListResponse = Awaited<
  ReturnType<typeof sdk.store.product.list>
>;

export async function listStoreProducts(
  query: StoreProductListQuery,
  timeoutMs = PRODUCT_LIST_TIMEOUT_MS,
): Promise<StoreProductListResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await sdk.client.fetch<StoreProductListResponse>("/store/products", {
      method: "GET",
      query,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
